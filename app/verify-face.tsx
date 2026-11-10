/**
 * Bank-style face verification (liveness check).
 *
 * 1. The user aligns their face inside the oval; a reference selfie is taken.
 * 2. Random-order challenges: turn left, turn right, blink, smile.
 *    Every challenge is measured on-device with Google ML Kit (head angle,
 *    eye-open and smile probabilities). There is no "demo" auto-pass.
 * 3. The selfie + one frame per challenge go to the verification-pipeline
 *    edge function, which stores them for review / face match.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Defs, Mask, Rect, Ellipse } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import FaceDetection, { type Face } from '@react-native-ml-kit/face-detection';
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Smile,
  ScanFace,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
  RotateCcw,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { submitVerification } from '@/lib/verification';

const BLUE = '#1D9BF0';
const GREEN = '#22C55E';
const AMBER = '#F59E0B';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const OVAL_W = SCREEN_W * 0.72;
const OVAL_H = OVAL_W * 1.32;
const OVAL_CX = SCREEN_W / 2;
const OVAL_CY = SCREEN_H * 0.4;

// Detection thresholds (ML Kit head euler angles are in degrees).
const ALIGN_MAX_YAW = 12;
const ALIGN_MAX_PITCH = 15;
const ALIGN_FRAMES_NEEDED = 2;
const TURN_MIN_YAW = 22;
const EYE_CLOSED = 0.3;
const EYE_OPEN = 0.6;
const SMILE_MIN = 0.75;
const FACE_MIN_RATIO = 0.3; // face width / short image side
const FACE_MAX_RATIO = 0.9;
const CHALLENGE_TIMEOUT_MS = 12000;
const FACE_LOST_FRAMES_LIMIT = 4;

type Phase = 'intro' | 'align' | 'challenge' | 'submitting' | 'success' | 'failed';
type ChallengeKind = 'turn_left' | 'turn_right' | 'blink' | 'smile';

type Feedback =
  | 'none'
  | 'no_face'
  | 'multiple_faces'
  | 'too_far'
  | 'too_close'
  | 'look_straight'
  | 'hold_still';

const TEXT = {
  tr: {
    align: 'Yüzünüzü ovalin içine yerleştirin',
    turn_left: 'Başınızı yavaşça sola çevirin',
    turn_right: 'Başınızı yavaşça sağa çevirin',
    blink: 'Gözlerinizi kapatıp açın',
    smile: 'Kameraya gülümseyin',
    no_face: 'Yüz algılanamadı',
    multiple_faces: 'Kadrajda yalnızca siz olmalısınız',
    too_far: 'Biraz yaklaşın',
    too_close: 'Biraz uzaklaşın',
    look_straight: 'Doğrudan kameraya bakın',
    hold_still: 'Sabit durun…',
    done: 'Harika!',
  },
  en: {
    align: 'Place your face inside the oval',
    turn_left: 'Slowly turn your head left',
    turn_right: 'Slowly turn your head right',
    blink: 'Close and open your eyes',
    smile: 'Smile at the camera',
    no_face: 'No face detected',
    multiple_faces: 'Only you should be in the frame',
    too_far: 'Move a little closer',
    too_close: 'Move a little back',
    look_straight: 'Look straight at the camera',
    hold_still: 'Hold still…',
    done: 'Great!',
  },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildChallenges(): ChallengeKind[] {
  return shuffle<ChallengeKind>(['turn_left', 'turn_right', 'blink', 'smile']);
}

function eyesOpen(face: Face): number {
  const l = face.leftEyeOpenProbability ?? 1;
  const r = face.rightEyeOpenProbability ?? 1;
  return Math.min(l, r);
}

async function safeDelete(uri?: string | null) {
  if (!uri) return;
  try {
    await FileSystemLegacy.deleteAsync(uri, { idempotent: true });
  } catch {}
}

async function toBase64Jpeg(uri: string, width: number, quality: number): Promise<string> {
  const r = await manipulateAsync(uri, [{ resize: { width } }], {
    compress: quality,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return `data:image/jpeg;base64,${r.base64}`;
}

function failureMessage(raw: string, code: string | undefined, isTr: boolean): string {
  const lower = String(raw || '').toLowerCase();
  if (code === 'no_profile_photo') {
    return isTr
      ? 'Doğrulamadan önce profilinize yüzünüzün net göründüğü bir fotoğraf ekleyin.'
      : 'Add a clear profile photo of your face before verifying.';
  }
  if (code === 'face_mismatch') {
    return isTr
      ? 'Yüzünüz profil fotoğrafınızla eşleşmedi. Kendi fotoğrafınızı kullandığınızdan emin olun.'
      : 'Your face did not match your profile photo.';
  }
  if (lower.includes('not authenticated') || lower.includes('jwt') || lower.includes('unauthorized')) {
    return isTr ? 'Oturumunuz doğrulanamadı. Çıkış yapıp tekrar giriş yapın.' : 'Session expired. Please sign in again.';
  }
  if (lower.includes('network request failed') || lower.includes('failed to fetch')) {
    return isTr ? 'İnternet bağlantısı kurulamadı.' : 'No internet connection.';
  }
  if (lower.includes('was not found') || lower.includes('/functions/v1/')) {
    return isTr ? 'Doğrulama servisine ulaşılamadı. Daha sonra tekrar deneyin.' : 'Verification service unavailable.';
  }
  return raw || (isTr ? 'Doğrulama tamamlanamadı.' : 'Verification failed.');
}

export default function VerifyFaceScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const existingStatus = profile?.verification_status;
  const { language } = useLanguage();
  const isTr = language === 'tr';
  const T = isTr ? TEXT.tr : TEXT.en;

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('intro');
  const [challenges, setChallenges] = useState<ChallengeKind[]>([]);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [faceOk, setFaceOk] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [voiceOn, setVoiceOn] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const phaseRef = useRef<Phase>('intro');
  const challengesRef = useRef<ChallengeKind[]>([]);
  const indexRef = useRef(0);
  const alignCountRef = useRef(0);
  const lostCountRef = useRef(0);
  const eyesClosedSeenRef = useRef(false);
  const firstTurnSignRef = useRef<number | null>(null);
  const challengeStartRef = useRef(0);
  const selfieUriRef = useRef<string | null>(null);
  const frameUrisRef = useRef<string[]>([]);

  // Animations
  const pulse = useRef(new Animated.Value(0)).current;
  const instructionAnim = useRef(new Animated.Value(1)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const speak = useCallback(
    (text: string) => {
      if (!voiceOn) return;
      Speech.stop();
      Speech.speak(text, { language: isTr ? 'tr-TR' : 'en-US', rate: 1.0 });
    },
    [voiceOn, isTr]
  );

  const flashSuccess = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    pulse.setValue(0);
    Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    instructionAnim.setValue(0);
    Animated.spring(instructionAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [pulse, instructionAnim]);

  // Looping arrow nudge for turn challenges
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [arrowAnim]);

  const cleanupFiles = useCallback(async () => {
    await safeDelete(selfieUriRef.current);
    for (const u of frameUrisRef.current) await safeDelete(u);
    selfieUriRef.current = null;
    frameUrisRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      phaseRef.current = 'intro';
      Speech.stop();
      cleanupFiles();
    };
  }, [cleanupFiles]);

  const start = async () => {
    if (!user?.id) return;
    if (Platform.OS === 'web') {
      Alert.alert('', isTr ? 'Yüz doğrulama yalnızca mobil uygulamada yapılabilir.' : 'Face verification is only available in the mobile app.');
      return;
    }
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          isTr ? 'Kamera izni' : 'Camera permission',
          isTr ? 'Yüz doğrulaması için kameraya erişim gereklidir.' : 'Camera access is required for face verification.'
        );
        return;
      }
    }
    await cleanupFiles();
    const list = buildChallenges();
    challengesRef.current = list;
    setChallenges(list);
    indexRef.current = 0;
    setChallengeIndex(0);
    alignCountRef.current = 0;
    lostCountRef.current = 0;
    eyesClosedSeenRef.current = false;
    firstTurnSignRef.current = null;
    setFeedback('none');
    setFaceOk(false);
    setResultMessage('');
    setPhaseBoth('align');
    speak(T.align);
  };

  const fail = useCallback(
    (message: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setResultMessage(message);
      setPhaseBoth('failed');
      Speech.stop();
    },
    []
  );

  const submit = useCallback(async () => {
    setPhaseBoth('submitting');
    Speech.stop();
    try {
      const selfieUri = selfieUriRef.current;
      if (!selfieUri) throw new Error(isTr ? 'Selfie alınamadı.' : 'Selfie missing.');
      const selfie = await toBase64Jpeg(selfieUri, 720, 0.85);
      const frames: string[] = [];
      for (const u of frameUrisRef.current) frames.push(await toBase64Jpeg(u, 480, 0.7));

      const result = await submitVerification(selfie, true, frames);
      await refreshProfile();
      await cleanupFiles();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setResultMessage(
          result.verification_status === 'verified'
            ? isTr ? 'Hesabınız doğrulandı. Mavi rozetiniz profilinize eklendi.' : 'Your account is verified.'
            : isTr
              ? 'Canlılık testini geçtiniz. Fotoğraf eşleştirmesi incelendikten sonra mavi rozetiniz eklenecek.'
              : 'Liveness check passed. You will get the blue badge after review.'
        );
        successScale.setValue(0);
        Animated.spring(successScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
        setPhaseBoth('success');
      } else {
        fail(failureMessage(result.message, result.code, isTr));
      }
    } catch (e: any) {
      fail(failureMessage(e?.message ?? '', undefined, isTr));
    }
  }, [cleanupFiles, fail, isTr, refreshProfile, successScale]);

  /** Evaluates one detection result against the current phase / challenge. */
  const handleDetection = useCallback(
    async (faces: Face[], photo: { uri: string; width: number; height: number }) => {
      let keepPhoto = false;
      try {
        if (faces.length === 0) {
          lostCountRef.current += 1;
          alignCountRef.current = 0;
          setFaceOk(false);
          setFeedback('no_face');
          if (phaseRef.current === 'challenge' && lostCountRef.current >= FACE_LOST_FRAMES_LIMIT) {
            fail(isTr ? 'Yüzünüz kadrajdan çıktı. Lütfen tekrar deneyin.' : 'Your face left the frame. Please try again.');
          }
          return;
        }
        if (faces.length > 1) {
          alignCountRef.current = 0;
          setFaceOk(false);
          setFeedback('multiple_faces');
          if (phaseRef.current === 'challenge') {
            fail(isTr ? 'Kadrajda birden fazla yüz algılandı.' : 'More than one face was detected.');
          }
          return;
        }
        lostCountRef.current = 0;
        const face = faces[0];
        const shortSide = Math.min(photo.width, photo.height) || 1;
        const ratio = face.frame.width / shortSide;
        const yaw = face.rotationY;
        const pitch = face.rotationX;

        if (phaseRef.current === 'align') {
          const problem: Feedback | null =
            ratio < FACE_MIN_RATIO
              ? 'too_far'
              : ratio > FACE_MAX_RATIO
                ? 'too_close'
                : Math.abs(yaw) > ALIGN_MAX_YAW || Math.abs(pitch) > ALIGN_MAX_PITCH || eyesOpen(face) < EYE_OPEN
                  ? 'look_straight'
                  : null;
          if (problem) {
            alignCountRef.current = 0;
            setFaceOk(false);
            setFeedback(problem);
            return;
          }
          setFaceOk(true);
          setFeedback('hold_still');
          alignCountRef.current += 1;
          if (alignCountRef.current >= ALIGN_FRAMES_NEEDED) {
            // Take a sharper reference selfie for face matching.
            const hq = await cameraRef.current?.takePictureAsync({ quality: 0.85, shutterSound: false });
            selfieUriRef.current = hq?.uri ?? photo.uri;
            if (!hq?.uri) keepPhoto = true;
            setFeedback('none');
            flashSuccess();
            indexRef.current = 0;
            setChallengeIndex(0);
            challengeStartRef.current = Date.now();
            eyesClosedSeenRef.current = false;
            setPhaseBoth('challenge');
            speak(T[challengesRef.current[0]]);
          }
          return;
        }

        if (phaseRef.current !== 'challenge') return;
        setFaceOk(true);
        setFeedback('none');

        if (Date.now() - challengeStartRef.current > CHALLENGE_TIMEOUT_MS) {
          fail(isTr ? 'Süre doldu. Talimatları takip ederek tekrar deneyin.' : 'Time is up. Please try again.');
          return;
        }

        const current = challengesRef.current[indexRef.current];
        let passed = false;
        // Front camera images can be mirrored depending on the device, so a turn
        // counts on either side as long as the two turns go in opposite directions.
        if (current === 'turn_left' || current === 'turn_right') {
          const other = current === 'turn_left' ? 'turn_right' : 'turn_left';
          const otherDone = challengesRef.current.slice(0, indexRef.current).includes(other);
          if (Math.abs(yaw) >= TURN_MIN_YAW) {
            if (!otherDone) {
              firstTurnSignRef.current = Math.sign(yaw);
              passed = true;
            } else if (firstTurnSignRef.current !== null && Math.sign(yaw) === -firstTurnSignRef.current) {
              passed = true;
            }
          }
        } else if (current === 'blink') {
          const open = eyesOpen(face);
          if (open < EYE_CLOSED) eyesClosedSeenRef.current = true;
          else if (eyesClosedSeenRef.current && open > EYE_OPEN) passed = true;
        } else if (current === 'smile') {
          passed = (face.smilingProbability ?? 0) >= SMILE_MIN;
        }

        if (passed) {
          frameUrisRef.current.push(photo.uri);
          keepPhoto = true;
          flashSuccess();
          const next = indexRef.current + 1;
          if (next >= challengesRef.current.length) {
            setChallengeIndex(next);
            await submit();
            return;
          }
          indexRef.current = next;
          setChallengeIndex(next);
          eyesClosedSeenRef.current = false;
          challengeStartRef.current = Date.now();
          speak(T[challengesRef.current[next]]);
        }
      } finally {
        if (!keepPhoto) safeDelete(photo.uri);
      }
    },
    [T, fail, flashSuccess, isTr, speak, submit]
  );

  // Detection loop: grab a low-quality frame, run ML Kit, repeat.
  useEffect(() => {
    if ((phase !== 'align' && phase !== 'challenge') || !cameraReady) return;
    let cancelled = false;
    (async () => {
      while (!cancelled && (phaseRef.current === 'align' || phaseRef.current === 'challenge')) {
        try {
          const photo = await cameraRef.current?.takePictureAsync({
            quality: 0.3,
            skipProcessing: true,
            shutterSound: false,
          });
          if (!photo?.uri || cancelled) {
            if (photo?.uri) safeDelete(photo.uri);
            continue;
          }
          const faces = await FaceDetection.detect(photo.uri, {
            performanceMode: 'fast',
            classificationMode: 'all',
            minFaceSize: 0.15,
          });
          if (cancelled) {
            safeDelete(photo.uri);
            break;
          }
          await handleDetection(faces, photo);
        } catch (e) {
          console.warn('face detection loop error', e);
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // handleDetection is stable enough per phase; re-running on every render would restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cameraReady]);

  // ───────────────────────── UI ─────────────────────────

  // Already submitted or approved: show the status instead of asking again.
  if (phase === 'intro' && (existingStatus === 'pending' || existingStatus === 'verified')) {
    const verified = existingStatus === 'verified';
    return (
      <SafeAreaView style={[styles.light, styles.center]} edges={['top', 'bottom']}>
        <View style={[styles.heroCircle, { backgroundColor: verified ? 'rgba(29,155,240,0.12)' : 'rgba(245,158,11,0.12)' }]}>
          {verified ? <BadgeCheck size={72} color={BLUE} strokeWidth={1.5} /> : <ShieldCheck size={68} color={AMBER} strokeWidth={1.5} />}
        </View>
        <Text style={styles.title}>
          {verified ? (isTr ? 'Hesabınız doğrulandı' : 'Account verified') : isTr ? 'Doğrulama inceleniyor' : 'Verification in review'}
        </Text>
        <Text style={styles.subtitle}>
          {verified
            ? isTr
              ? 'Mavi rozetiniz profilinizde görünüyor.'
              : 'Your blue badge is visible on your profile.'
            : isTr
              ? 'Yüz doğrulamanız alındı. Onaylandığında mavi rozetiniz otomatik eklenecek; tekrar doğrulama yapmanıza gerek yok.'
              : 'We received your verification. The blue badge will be added automatically once approved.'}
        </Text>
        <View style={{ width: '100%', paddingHorizontal: 24, marginTop: 24 }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>{isTr ? 'Tamam' : 'OK'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.light} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isTr ? 'Kimlik doğrulama' : 'Identity check'}</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.introBody}>
          <View style={styles.heroCircle}>
            <ScanFace size={72} color={BLUE} strokeWidth={1.4} />
          </View>
          <Text style={styles.title}>{isTr ? 'Yüz doğrulama' : 'Face verification'}</Text>
          <Text style={styles.subtitle}>
            {isTr
              ? 'Gerçek bir kişi olduğunuzu ve profil fotoğrafınızın size ait olduğunu doğrulayalım. Yaklaşık 20 saniye sürer.'
              : "Let's confirm you're a real person and your profile photo is you. Takes about 20 seconds."}
          </Text>
          <View style={styles.tips}>
            {[
              { icon: <ScanFace size={20} color={BLUE} />, tr: 'Yüzünüzü ovale yerleştirin', en: 'Fit your face in the oval' },
              { icon: <ChevronLeft size={20} color={BLUE} />, tr: 'Ekrandaki hareketleri yapın', en: 'Follow the on-screen moves' },
              { icon: <Eye size={20} color={BLUE} />, tr: 'İyi aydınlatılmış bir ortamda olun', en: 'Be in a well-lit place' },
              { icon: <ShieldCheck size={20} color={BLUE} />, tr: 'Gözlük ve şapka çıkarın', en: 'Remove glasses and hats' },
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipIcon}>{tip.icon}</View>
                <Text style={styles.tipText}>{isTr ? tip.tr : tip.en}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={start} activeOpacity={0.85}>
            <Camera size={22} color="#FFF" />
            <Text style={styles.primaryBtnText}>{isTr ? 'Başla' : 'Start'}</Text>
          </TouchableOpacity>
          <Text style={styles.privacy}>
            {isTr
              ? 'Görüntüleriniz yalnızca doğrulama için kullanılır ve profilinizde gösterilmez.'
              : 'Images are only used for verification and never shown on your profile.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'align' || phase === 'challenge') {
    const current = challenges[challengeIndex];
    const totalSteps = challenges.length + 1;
    const doneSteps = phase === 'align' ? 0 : challengeIndex + 1;
    const instruction = phase === 'align' ? T.align : current ? T[current] : T.done;
    const hint = feedback !== 'none' ? T[feedback] : '';
    const ringColor = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [faceOk ? GREEN : '#FFFFFF', GREEN, faceOk ? GREEN : '#FFFFFF'] });
    const ringWidth = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [4, 9, 4] });
    const arrowShift = arrowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });

    return (
      <View style={styles.dark}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          animateShutter={false}
          onCameraReady={() => setCameraReady(true)}
        />
        <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Mask id="oval">
              <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="white" />
              <Ellipse cx={OVAL_CX} cy={OVAL_CY} rx={OVAL_W / 2} ry={OVAL_H / 2} fill="black" />
            </Mask>
          </Defs>
          <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="rgba(5,10,20,0.78)" mask="url(#oval)" />
        </Svg>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ovalRing,
            { borderColor: ringColor as any, borderWidth: ringWidth as any },
          ]}
        />

        {/* Turn arrows */}
        {phase === 'challenge' && (current === 'turn_left' || current === 'turn_right') && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.arrow,
              current === 'turn_left'
                ? { left: 6, transform: [{ translateX: Animated.multiply(arrowShift, -1) }] }
                : { right: 6, transform: [{ translateX: arrowShift }] },
            ]}>
            {current === 'turn_left' ? <ChevronLeft size={56} color="#FFF" /> : <ChevronRight size={56} color="#FFF" />}
          </Animated.View>
        )}

        <SafeAreaView style={styles.overlayTop} edges={['top']} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => {
              Speech.stop();
              cleanupFiles();
              setPhaseBoth('intro');
            }}>
            <X size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View key={i} style={[styles.progressDot, i < doneSteps && styles.progressDotDone, i === doneSteps && styles.progressDotActive]} />
            ))}
          </View>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => {
              if (voiceOn) Speech.stop();
              setVoiceOn((v) => !v);
            }}>
            {voiceOn ? <Volume2 size={20} color="#FFF" /> : <VolumeX size={20} color="#FFF" />}
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.instructionWrap} pointerEvents="none">
          <Animated.View
            style={[
              styles.instructionCard,
              {
                opacity: instructionAnim,
                transform: [{ scale: instructionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}>
            <View style={styles.instructionIcon}>
              {phase === 'align' ? (
                <ScanFace size={26} color="#FFF" />
              ) : current === 'blink' ? (
                <Eye size={26} color="#FFF" />
              ) : current === 'smile' ? (
                <Smile size={26} color="#FFF" />
              ) : current === 'turn_left' ? (
                <ChevronLeft size={26} color="#FFF" />
              ) : (
                <ChevronRight size={26} color="#FFF" />
              )}
            </View>
            <Text style={styles.instructionText}>{instruction}</Text>
            <Text style={[styles.hintText, { color: feedback === 'hold_still' ? GREEN : AMBER }]}>{hint || ' '}</Text>
          </Animated.View>
          <Text style={styles.stepText}>
            {isTr ? `Adım ${Math.min(doneSteps + 1, totalSteps)} / ${totalSteps}` : `Step ${Math.min(doneSteps + 1, totalSteps)} of ${totalSteps}`}
          </Text>
        </View>
      </View>
    );
  }

  if (phase === 'submitting') {
    return (
      <SafeAreaView style={[styles.light, styles.center]} edges={['top', 'bottom']}>
        <View style={styles.heroCircle}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
        <Text style={styles.title}>{isTr ? 'Doğrulanıyor' : 'Verifying'}</Text>
        <Text style={styles.subtitle}>
          {isTr ? 'Canlılık ve yüz eşleştirme sonuçları gönderiliyor…' : 'Sending liveness and face match results…'}
        </Text>
      </SafeAreaView>
    );
  }

  const success = phase === 'success';
  return (
    <SafeAreaView style={[styles.light, styles.center]} edges={['top', 'bottom']}>
      <Animated.View
        style={[
          styles.heroCircle,
          { backgroundColor: success ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)' },
          success && { transform: [{ scale: successScale }] },
        ]}>
        {success ? <BadgeCheck size={72} color={GREEN} strokeWidth={1.5} /> : <X size={64} color="#EF4444" />}
      </Animated.View>
      <Text style={styles.title}>
        {success ? (isTr ? 'Doğrulama tamamlandı' : 'Verification complete') : isTr ? 'Doğrulama başarısız' : 'Verification failed'}
      </Text>
      <Text style={styles.subtitle}>{resultMessage}</Text>
      <View style={{ width: '100%', paddingHorizontal: 24, gap: 12, marginTop: 24 }}>
        {!success && (
          <TouchableOpacity style={styles.primaryBtn} onPress={start} activeOpacity={0.85}>
            <RotateCcw size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>{isTr ? 'Tekrar dene' : 'Try again'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={success ? styles.primaryBtn : styles.secondaryBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}>
          <Text style={success ? styles.primaryBtnText : styles.secondaryBtnText}>{isTr ? 'Profile dön' : 'Back to profile'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  light: { flex: 1, backgroundColor: '#F7F9FC' },
  dark: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  introBody: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
  heroCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(29,155,240,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },
  tips: { width: '100%', marginTop: 28, gap: 12 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EEF5',
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(29,155,240,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: { fontSize: 15, color: '#1E293B', flex: 1 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BLUE,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  privacy: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  ovalRing: {
    position: 'absolute',
    left: OVAL_CX - OVAL_W / 2,
    top: OVAL_CY - OVAL_H / 2,
    width: OVAL_W,
    height: OVAL_H,
    borderRadius: OVAL_W,
  },
  arrow: { position: 'absolute', top: OVAL_CY - 28 },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  glassBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 22, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  progressDotDone: { backgroundColor: GREEN },
  progressDotActive: { backgroundColor: '#FFF' },
  instructionWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: OVAL_CY + OVAL_H / 2 + 24,
    alignItems: 'center',
  },
  instructionCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  instructionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  instructionText: { color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  hintText: { fontSize: 14, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  stepText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 10 },
});
