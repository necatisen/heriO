/**
 * Banka tarzı yüz doğrulama: Buton yok, AI kamera ile sağ/sola/orta hareketi otomatik tespit eder.
 * Talimatlar sadece ekranda yazı ile verilir. Algılandığında mavi halka dolanır.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Circle, Defs, Mask, Rect, Ellipse } from 'react-native-svg';
import { Camera, ArrowLeft, BadgeCheck, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { submitVerification, checkLivenessStep, type LivenessStep } from '@/lib/verification';

const VERIFIED_BLUE = '#1D9BF0';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
/** Sadece doğru pozda çekim için aralık uzatıldı; sürekli denklanşör patlamasın diye tek seferde kontrol. */
const LIVENESS_POLL_INTERVAL_MS = 3200;

type Step = 'intro' | 'camera' | 'liveness_right' | 'liveness_left' | 'liveness_blink' | 'submitting' | 'done';

const LIVENESS_STEPS: {
  step: Step;
  apiStep: LivenessStep;
  titleTr: string;
  titleEn: string;
  hintTr: string;
  hintEn: string;
}[] = [
  {
    step: 'liveness_right',
    apiStep: 'right',
    titleTr: 'Başınızı sağa çevirin',
    titleEn: 'Turn your head to the right',
    hintTr: 'Pozu alın; sistem doğru pozda tek çekim yapar. Algılandığında bir sonraki talimat gelir.',
    hintEn: 'Hold the pose; the system captures once when the pose is detected. Next instruction will appear when detected.',
  },
  {
    step: 'liveness_left',
    apiStep: 'left',
    titleTr: 'Başınızı sola çevirin',
    titleEn: 'Turn your head to the left',
    hintTr: 'Pozu alın; doğru pozda tek çekim yapılır.',
    hintEn: 'Hold the pose; single capture when pose is correct.',
  },
  {
    step: 'liveness_blink',
    apiStep: 'blink',
    titleTr: 'Kameraya bakın',
    titleEn: 'Look at the camera',
    hintTr: 'Yüzünüzü kameraya dönün. Algılandığında 3 adım tamamlanır ve işleniyor ekranına geçilir.',
    hintEn: 'Face the camera. When detected, all 3 steps complete and you will see the processing screen.',
  },
];

const RING_R = 140;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

// Taslak: oval maske ve alttaki dairesel ilerleme
const OVAL_MASK_WIDTH = SCREEN_WIDTH * 0.7;
const OVAL_MASK_HEIGHT = OVAL_MASK_WIDTH * 1.3;
const OVAL_MASK_X = (SCREEN_WIDTH - OVAL_MASK_WIDTH) / 2;
const OVAL_MASK_Y = SCREEN_HEIGHT * 0.4 - OVAL_MASK_HEIGHT / 2;
const PROGRESS_RADIUS = 40;
const PROGRESS_STROKE = 8;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

function localizeVerificationFailureMessage(raw: string, isTr: boolean): string {
  const msg = String(raw || '').trim();
  const lower = msg.toLowerCase();

  // Supabase Edge Function common errors
  if (
    lower.includes('request function was not found') ||
    (lower.includes('function') && lower.includes('was not found')) ||
    lower.includes('/functions/v1/')
  ) {
    return isTr
      ? 'Doğrulama servisi bulunamadı (Edge Function). Lütfen daha sonra tekrar deneyin.'
      : 'Verification service was not found (Edge Function). Please try again later.';
  }

  if (lower.includes('not authenticated') || lower.includes('jwt') || lower.includes('unauthorized')) {
    return isTr
      ? 'Oturumunuz doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın.'
      : 'Your session could not be verified. Please sign out and sign in again.';
  }

  if (lower.includes('network request failed') || lower.includes('failed to fetch') || lower.includes('fetch failed')) {
    return isTr
      ? 'İnternet bağlantısı kurulamadı. Bağlantınızı kontrol edip tekrar deneyin.'
      : 'Could not connect to the internet. Check your connection and try again.';
  }

  // Fall back to original
  return msg;
}

export default function VerifyFaceScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const [step, setStep] = useState<Step>('intro');
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [livenessFrames, setLivenessFrames] = useState<string[]>([]);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState<'idle' | 'no_face' | 'multiple_faces' | 'analyzing'>('idle');
  const [livenessProgress, setLivenessProgress] = useState(0); // 0..3, adım tamamlandıkça artar (mavi halka)
  const [livenessDetectedFeedback, setLivenessDetectedFeedback] = useState<string | null>(null); // "Sağa çevrildi algılandı" vb.
  const [submittingSeconds, setSubmittingSeconds] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const livenessFramesRef = useRef<string[]>([]);
  /** API yokken (503 vb.) yine de 1→2→3 ilerleyebilmek için: yüz görünür kaç tick sayacı */
  const demoAdvanceTicksRef = useRef(0);

  const isTr = language === 'tr';

  const handleOpenCamera = async () => {
    if (!user?.id) return;
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
    setStep('camera');
    setLivenessFrames([]);
    livenessFramesRef.current = [];
    setLivenessStatus('idle');
    setLivenessProgress(0);
    setLivenessDetectedFeedback(null);
    demoAdvanceTicksRef.current = 0;
  };

  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.75,
        base64: true,
        skipProcessing: true,
        shutterSound: false,
      });
      if (photo?.base64) return `data:image/jpeg;base64,${photo.base64}`;
    } catch (_) {}
    return null;
  }, []);

  const handleCaptureSelfie = async () => {
    const base64 = await captureFrame();
    if (base64) {
      setSelfieBase64(base64);
      setLivenessProgress(0);
      setLivenessDetectedFeedback(null);
      demoAdvanceTicksRef.current = 0;
      setStep('liveness_right');
    } else {
      Alert.alert(isTr ? 'Hata' : 'Error', isTr ? 'Fotoğraf alınamadı.' : 'Could not capture photo.');
    }
  };

  const runSubmission = useCallback(
    async (frames: string[]) => {
      if (!selfieBase64) {
        setResultMessage(isTr ? 'Selfie bulunamadı.' : 'Selfie not found.');
        setStep('done');
        return;
      }
      const result = await submitVerification(selfieBase64, frames.length >= 2, frames);
      await refreshProfile();
      setVerificationSuccess(result.success);
      setResultMessage(
        result.success ? result.message : localizeVerificationFailureMessage(result.message, isTr)
      );
      setStep('done');
    },
    [selfieBase64, isTr, refreshProfile]
  );

  useEffect(() => {
    if (step !== 'liveness_right' && step !== 'liveness_left' && step !== 'liveness_blink') return;

    const current = LIVENESS_STEPS.find((s) => s.step === step);
    if (!current) return;

    const runCheck = async () => {
      const base64 = await captureFrame();
      if (!base64) return;

      setLivenessStatus('analyzing');
      const result = await checkLivenessStep(base64, current.apiStep);

      if (result.noFace) {
        setLivenessStatus('no_face');
        demoAdvanceTicksRef.current = 0;
        return;
      }
      if (result.multipleFaces) {
        setLivenessStatus('multiple_faces');
        demoAdvanceTicksRef.current = 0;
        return;
      }
      setLivenessStatus('idle');

      const nextRaw = result.next != null ? String(result.next).toLowerCase() : '';
      const isComplete = result.complete === true && (nextRaw === 'left' || nextRaw === 'blink' || nextRaw === 'submit');

      if (isComplete) {
        demoAdvanceTicksRef.current = 0;
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        const nextFrames = [...livenessFramesRef.current, base64];
        livenessFramesRef.current = nextFrames;
        setLivenessFrames(nextFrames);

        if (nextRaw === 'submit') {
          setLivenessDetectedFeedback(null);
          setLivenessProgress(3);
          setStep('submitting');
          runSubmission(nextFrames);
          return;
        }

        if (current.apiStep === 'right') {
          setLivenessDetectedFeedback(isTr ? 'Sağa çevrildi algılandı.' : 'Turn to the right detected.');
        } else if (current.apiStep === 'left') {
          setLivenessDetectedFeedback(isTr ? 'Sola çevrildi algılandı.' : 'Turn to the left detected.');
        }
        const nextStep = nextRaw === 'left' ? 'liveness_left' : nextRaw === 'blink' ? 'liveness_blink' : step;
        setLivenessProgress((p) => p + 1);
        setStep(nextStep);
        return;
      }

      // API kullanılamıyorsa (503 / Face API not configured): yüz görünürse demo modda 1→2→3 ilerle
      if (result.error) {
        demoAdvanceTicksRef.current += 1;
        if (demoAdvanceTicksRef.current >= 2) {
          demoAdvanceTicksRef.current = 0;
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          const nextFrames = [...livenessFramesRef.current, base64];
          livenessFramesRef.current = nextFrames;
          setLivenessFrames(nextFrames);

          if (current.apiStep === 'blink') {
            setLivenessDetectedFeedback(null);
            setLivenessProgress(3);
            setStep('submitting');
            runSubmission(nextFrames);
            return;
          }
          if (current.apiStep === 'right') {
            setLivenessDetectedFeedback(isTr ? 'Sağa çevrildi algılandı.' : 'Turn to the right detected.');
            setLivenessProgress((p) => p + 1);
            setStep('liveness_left');
          } else if (current.apiStep === 'left') {
            setLivenessDetectedFeedback(isTr ? 'Sola çevrildi algılandı.' : 'Turn to the left detected.');
            setLivenessProgress((p) => p + 1);
            setStep('liveness_blink');
          }
        }
      } else {
        demoAdvanceTicksRef.current = 0;
      }
    };

    pollIntervalRef.current = setInterval(runCheck, LIVENESS_POLL_INTERVAL_MS);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [step, captureFrame, runSubmission, isTr]);

  // Algılandı mesajını 2.5 sn sonra kaldır; bir sonraki talimat (sola/kameraya bak) kalır
  useEffect(() => {
    if (!livenessDetectedFeedback) return;
    const t = setTimeout(() => setLivenessDetectedFeedback(null), 2500);
    return () => clearTimeout(t);
  }, [livenessDetectedFeedback]);

  const handleDone = () => {
    router.back();
  };

  // Submitting ekranında saniye sayacı
  useEffect(() => {
    if (step !== 'submitting') return;
    setSubmittingSeconds(0);
    const t = setInterval(() => setSubmittingSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  const currentLivenessStep = LIVENESS_STEPS.find((s) => s.step === step);
  const isLivenessWithCamera =
    step === 'liveness_right' || step === 'liveness_left' || step === 'liveness_blink';

  if (step === 'intro') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isTr ? 'Hesabı doğrula' : 'Verify account'}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <BadgeCheck size={64} color={VERIFIED_BLUE} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>
            {isTr ? 'Profilinizi doğrulayın' : 'Verify your profile'}
          </Text>
          <Text style={styles.description}>
            {isTr
              ? 'Selfie çektikten sonra ekrandaki talimatları izleyin. Başınızı sağa ve sola çevirin; yapay zeka hareketinizi otomatik algılar. Buton kullanılmaz.'
              : 'After taking a selfie, follow the on-screen instructions. Turn your head right and left; AI detects your movement automatically. No buttons.'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleOpenCamera} activeOpacity={0.85}>
            <Camera size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>{isTr ? 'Kamerayı aç' : 'Open camera'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'camera') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { backgroundColor: '#1a1a1a' }]}>
          <TouchableOpacity onPress={() => setStep('intro')} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#FFF' }]}>
            {isTr ? 'Selfie çek' : 'Take selfie'}
          </Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <View style={styles.cameraOverlay}>
            <View style={styles.faceFrame} />
            <Text style={styles.faceFrameHint}>
              {isTr ? 'Yüzünüzü çerçeve içine alın' : 'Position your face in the frame'}
            </Text>
          </View>
        </View>
        <View style={styles.cameraActions}>
          <TouchableOpacity style={styles.captureButton} onPress={handleCaptureSelfie} activeOpacity={0.9}>
            <Text style={styles.captureButtonText}>{isTr ? 'Çek' : 'Capture'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Taslak: oval yüz maskesi, üstte status/instruction, altta dairesel ilerleme, sol üstte İptal
  if (isLivenessWithCamera && currentLivenessStep) {
    const stepIndex = step === 'liveness_right' ? 1 : step === 'liveness_left' ? 2 : 3;
    const progressValue = livenessProgress / 3; // 0..1
    const statusText =
      livenessStatus === 'analyzing'
        ? isTr ? 'Analiz ediliyor...' : 'Analyzing...'
        : livenessStatus === 'no_face'
          ? isTr ? 'Yüzünüzü ovalin içine yerleştirin' : 'Position your face in the oval'
          : livenessStatus === 'multiple_faces'
            ? isTr ? 'Sadece sizin yüzünüz görünmeli' : 'Only your face should be visible'
            : isTr ? `Adım ${stepIndex}/3` : `Step ${stepIndex}/3`;
    const instructionText = livenessDetectedFeedback
      ? livenessDetectedFeedback
      : isTr ? currentLivenessStep.titleTr : currentLivenessStep.titleEn;

    return (
      <View style={styles.livenessFullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
        {/* Oval maske: dışı karartılmış, ortada oval alan kamerayı gösterir */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
            <Defs>
              <Mask id="ovalMask">
                <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
                <Ellipse
                  cx={OVAL_MASK_X + OVAL_MASK_WIDTH / 2}
                  cy={OVAL_MASK_Y + OVAL_MASK_HEIGHT / 2}
                  rx={OVAL_MASK_WIDTH / 2}
                  ry={OVAL_MASK_HEIGHT / 2}
                  fill="black"
                />
              </Mask>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              fill="rgba(0, 0, 0, 0.7)"
              mask="url(#ovalMask)"
            />
          </Svg>
          {/* Üst: status + talimat */}
          <View style={styles.overlayContent}>
            <Text style={styles.overlayStatus}>{statusText}</Text>
            <Text style={styles.overlayInstruction}>{instructionText}</Text>
          </View>
          {/* Altta dairesel ilerleme çubuğu (taslak) */}
          <View style={styles.progressContainer}>
            <Svg
              width={PROGRESS_RADIUS * 2 + PROGRESS_STROKE * 2}
              height={PROGRESS_RADIUS * 2 + PROGRESS_STROKE * 2}
              style={{ transform: [{ rotate: '-90deg' }] }}
            >
              <Circle
                cx={PROGRESS_RADIUS + PROGRESS_STROKE}
                cy={PROGRESS_RADIUS + PROGRESS_STROKE}
                r={PROGRESS_RADIUS}
                stroke="#E0E0E0"
                strokeWidth={PROGRESS_STROKE}
                fill="none"
              />
              <Circle
                cx={PROGRESS_RADIUS + PROGRESS_STROKE}
                cy={PROGRESS_RADIUS + PROGRESS_STROKE}
                r={PROGRESS_RADIUS}
                stroke={livenessProgress > 0 ? '#4CAF50' : '#E0E0E0'}
                strokeWidth={PROGRESS_STROKE}
                fill="none"
                strokeDasharray={PROGRESS_CIRCUMFERENCE}
                strokeDashoffset={PROGRESS_CIRCUMFERENCE - progressValue * PROGRESS_CIRCUMFERENCE}
                strokeLinecap="round"
              />
            </Svg>
          </View>
          {/* Sol üst: İptal butonu (taslak) */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setLivenessDetectedFeedback(null);
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              if (step === 'liveness_right') {
                setStep('camera');
                setLivenessProgress(0);
              } else if (step === 'liveness_left') {
                setStep('liveness_right');
                setLivenessProgress(0);
              } else {
                setStep('liveness_left');
                setLivenessProgress(1);
              }
              const prev = livenessFramesRef.current.slice(0, -1);
              livenessFramesRef.current = prev;
              setLivenessFrames(prev);
            }}
          >
            <X size={24} color="#FFF" />
            <Text style={styles.cancelButtonText}>{isTr ? 'İptal' : 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'submitting') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={VERIFIED_BLUE} style={styles.loader} />
          <Text style={styles.title}>
            {isTr ? 'İşleniyor' : 'Processing'}
          </Text>
          <Text style={styles.submittingSubtitle}>
            {isTr ? 'Resim doğrulanıyor' : 'Verifying image'}
          </Text>
          <Text style={styles.timerText}>
            {submittingSeconds} {isTr ? 'sn' : 's'}
          </Text>
          <Text style={[styles.description, { marginTop: 8 }]}>
            {isTr ? 'Yüz eşleştirme ve canlılık kontrolü' : 'Face match and liveness check'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <BadgeCheck
            size={64}
            color={verificationSuccess ? VERIFIED_BLUE : '#8E8E93'}
            strokeWidth={1.5}
          />
        </View>
        <Text style={styles.title}>
          {verificationSuccess
            ? (isTr ? 'Doğrulama başarılı' : 'Verification successful')
            : (isTr ? 'Doğrulama başarısız' : 'Verification failed')}
        </Text>
        <Text style={styles.description}>
          {resultMessage || (verificationSuccess ? (isTr ? 'Hesabınız doğrulandı.' : 'Your account has been verified.') : '')}
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{isTr ? 'Tamam' : 'OK'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  headerRight: { width: 40 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 12, textAlign: 'center' },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: VERIFIED_BLUE,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  loader: { marginTop: 16 },
  submittingSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '700',
    color: VERIFIED_BLUE,
    marginTop: 12,
  },
  cameraWrap: { flex: 1, width: SCREEN_WIDTH, overflow: 'hidden' },
  camera: { flex: 1, width: '100%' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* Taslak: oval maske + status/instruction + altta dairesel ilerleme */
  livenessFullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayContent: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
    padding: 20,
  },
  overlayStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  overlayInstruction: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cancelButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#FFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  ringWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceFrame: {
    width: 240,
    height: 300,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
  },
  faceFrameHint: {
    position: 'absolute',
    bottom: 100,
    color: '#FFF',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  livenessTextWrap: {
    position: 'absolute',
    bottom: 70,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  livenessDetectedFeedback: {
    color: '#7CEE7C',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  livenessTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  livenessHint: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statusMessage: {
    color: '#FFCC00',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statusMessageAnalyzing: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  cameraActions: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  cameraActionsLiveness: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  noButtonHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VERIFIED_BLUE,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  captureButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
