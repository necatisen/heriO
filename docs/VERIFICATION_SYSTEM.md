# Verification System Architecture (Blue Check)

## Overview

Professional **identity verification** for a chat app: users prove they are the person in their profile photo. The system is designed to resist:

- **Fake photos** (someone else’s picture)
- **Screenshots / printed photos** (replay)
- **Bots** (no real camera)
- **Deepfakes** (mitigated by liveness + server checks)

**Rule:** Mavi tik **sadece** `verification_status === 'verified'` iken gösterilir. Profil veya galeri fotoğrafı yüklemek asla doğrulama yapmaz.

---

## 4-Stage Verification Pipeline

```
User taps "Hesabımı Doğrula"
        ↓
[1] SELFIE CAPTURE (live camera, no gallery)
        ↓
[2] Server: selfie checks (face detection, single face, quality, framing)
        ↓
[3] FACE MATCH (selfie vs profile photo, cosine similarity ≥ 0.80)
        ↓
[4] LIVENESS (motion/challenge so photo/screen replay fails)
        ↓
Result → pending_review (admin approves) or auto verified
```

---

### Stage 1: Selfie Capture

**Client**

- "Hesabımı Doğrula" → open **device camera** (front), not gallery.
- Use `expo-camera` for live preview; capture on button press.
- Upload captured image (base64 or signed URL) to backend.

**Server (verification pipeline)**

- **Face detection:** At least one face in image.
- **Single face:** Exactly one face (no group/photo-of-photo).
- **Image quality:** Min resolution, focus, lighting (e.g. blur score).
- **Framing:** Face in frame (e.g. face bounding box within central area).

Failure at this stage returns a structured error (e.g. `no_face`, `multiple_faces`, `low_quality`, `face_out_of_frame`).

---

### Stage 2: Face Match

- **Inputs:** Selfie image (from Stage 1), profile photo URL (from `profiles.profile_picture`).
- **Process:**
  - Generate **face embedding** for selfie and for profile photo (same model).
  - `similarity = cosineSimilarity(profileVector, selfieVector)`.
- **Rule:** If `similarity >= 0.80` → same person; else reject (e.g. `face_mismatch`).

Production: use a face recognition API (e.g. Azure Face API, AWS Rekognition) or an internal embedding service.

---

### Stage 3: Liveness Detection

- **Goal:** Block verification using a static photo, screenshot, or printed image.
- **Client (yönlendirmeli):** Kullanıcı ekrandaki talimatları takip eder:
  1. **Sağa baş çevir** – kamera açık, “Başınızı yavaşça sağa çevirin” → “Yaptım” ile kare alınır.
  2. **Sola baş çevir** – “Başınızı yavaşça sola çevirin” → kare alınır.
  3. **Göz kırp** – “Göz kırpın” → kare alınır.
- **Backend:** En az 2 liveness karesi gerekir. Azure Face API açıksa her karede tek yüz tespit edilir; yoksa sadece kare sayısı kontrol edilir.

Failure → `liveness_failed`.

---

### Stage 4: Outcome

- **On full success:** Create `verification_attempts` row (e.g. `status: 'pending_review'` or `approved`). Set `profiles.verification_status = 'pending'` (manual review) or `'verified'` (auto-approve).
- **Policy:** Only backend/admin can set `verification_status` to `verified` or `rejected` (via `set_verification_status` RPC). Client never sets `verified`.

---

## Data Model

### `profiles`

- `verification_status`: `unverified` | `pending` | `verified` | `rejected`
- No other field (e.g. photo upload) may set `verification_status`; only RPC/Edge Function/admin.

### `verification_attempts`

- `id`, `user_id`, `selfie_storage_path`, `profile_photo_url`
- `stage_1_passed`, `stage_2_similarity`, `stage_3_passed`
- `status`: `pending_review` | `approved` | `rejected`
- `rejection_reason`, `created_at`, `reviewed_at`
- Enables audit and manual review UI.

### Storage

- **Bucket:** `verification-selfies` (private).
- **Path:** `{user_id}/{attempt_id}.jpg` (or similar).
- Only service role / backend reads; client uploads via signed URL or through Edge Function.

---

## Backend Contract (Edge Function)

**Endpoint:** `POST /functions/v1/verification-pipeline`

**Request (JSON):**

```json
{
  "selfie_base64": "data:image/jpeg;base64,...",
  "liveness_passed": true
}
```

**Response (success):**

```json
{
  "success": true,
  "verification_status": "pending",
  "message": "Verification submitted for review"
}
```

**Response (failure):**

```json
{
  "success": false,
  "stage": "selfie_capture",
  "code": "multiple_faces",
  "message": "Only one face allowed in the photo"
}
```

**Stages:** `selfie_capture` | `face_match` | `liveness` | `complete`.

---

## Frontend Flow

1. User opens Verify screen → reads requirements (live selfie, face in frame, etc.).
2. **Camera screen:** Live camera (expo-camera), overlay “Position your face in the frame”.
3. **Capture** → optional **liveness:** e.g. “Please blink” then second capture or short recording.
4. Upload selfie (base64 to Edge Function or upload to storage then send path).
5. Call `verification-pipeline`; show result (pending / failed with `stage` and `message`).
6. Badge: only `verification_status === 'verified'` shows blue check; `pending` shows “under review” if desired.

---

## Security

- **Auth:** Edge Function validates JWT; `user_id` must equal `auth.uid()`.
- **Rate limit:** Limit verification attempts per user per day (e.g. in DB or Edge Function).
- **No client trust for final status:** Client cannot set `verification_status` to `verified`; only service role / admin RPC.

---

## Azure Face API (AI doğrulama)

Edge Function, aşağıdaki env değişkenleri tanımlıysa **Azure Face API** kullanır:

- `AZURE_FACE_ENDPOINT` – örn. `https://<adınız>.cognitiveservices.azure.com`
- `AZURE_FACE_KEY` – abonelik anahtarı

**Akış:** Selfie ve profil fotoğrafı için Face Detect → iki `faceId` ile Face Verify → `confidence >= 0.80` ise aynı kişi kabul edilir. Liveness karelerinde her birinde tek yüz tespit edilmesi gerekir.

Tanımlı değilse mock (sadece boyut + liveness kare sayısı) çalışır.

## Production Checklist

- [x] Client: yönlendirmeli liveness (sağa/sola baş çevir, göz kırp).
- [x] Edge Function: Azure Face API ile Stage 1 (detect), Stage 2 (verify), Stage 3 (liveness karelerinde detect).
- [ ] Add rate limiting and abuse monitoring.
- [ ] Admin UI to list `verification_attempts` and approve/reject.
