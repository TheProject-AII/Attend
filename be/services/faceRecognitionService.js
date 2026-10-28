const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");
const { getEmployeePhotoBuffer } = require("./employeePhotoService");

const FACE_API_URL = process.env.FACE_API_URL;
const FACE_API_KEY = process.env.FACE_API_KEY;
const FACE_TIMEOUT_MS = 60000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

const photoCache = new Map();

function getMimeType(filePath) {
  const ext = path.extname(filePath || "").toLowerCase();

  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function getCachedPhoto(key) {
  const item = photoCache.get(key);

  if (!item) return null;

  if (Date.now() - item.createdAt > CACHE_TTL_MS) {
    photoCache.delete(key);
    return null;
  }

  // Refresh insertion order for LRU behavior.
  photoCache.delete(key);
  photoCache.set(key, item);

  return item.buffer;
}

function setCachedPhoto(key, buffer) {
  if (!key || !Buffer.isBuffer(buffer)) return;

  photoCache.delete(key);
  photoCache.set(key, { buffer, createdAt: Date.now() });

  while (photoCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = photoCache.keys().next().value;
    photoCache.delete(oldestKey);
  }
}

function invalidateEmployeePhotoCache(referenceKey) {
  if (referenceKey) photoCache.delete(referenceKey);
}

async function getReferencePhoto(referenceKey) {
  if (!referenceKey) {
    const error = new Error("Foto referensi karyawan belum tersedia.");
    error.code = "FACE_REFERENCE_MISSING";
    throw error;
  }

  const cached = getCachedPhoto(referenceKey);
  if (cached) return cached;

  const buffer = await getEmployeePhotoBuffer(referenceKey);

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Gagal mengambil foto referensi karyawan.");
  }

  setCachedPhoto(referenceKey, buffer);
  return buffer;
}

function makeBlob(buffer, mimeType) {
  return new Blob([buffer], { type: mimeType });
}

async function parseFaceApiResponse(response) {
  const raw = await response.text();

  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.detail || data.message || `Face API error (${response.status})`,
    );

    error.status = response.status;
    error.code =
      response.status === 422
        ? "FACE_VALIDATION_FAILED"
        : response.status === 401
          ? "FACE_API_UNAUTHORIZED"
          : "FACE_API_ERROR";

    throw error;
  }

  return data;
}

async function postFaceApi(endpoint, form) {
  if (!FACE_API_URL || !FACE_API_KEY) {
    const error = new Error("Konfigurasi Face Recognition belum lengkap.");
    error.code = "FACE_API_CONFIG";
    throw error;
  }

  const baseUrl = FACE_API_URL.replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "X-Face-API-Key": FACE_API_KEY,
    },
    body: form,
    signal: AbortSignal.timeout(FACE_TIMEOUT_MS),
  });

  return parseFaceApiResponse(response);
}

/**
 * Enrollment pertama.
 * Embedding foto HR disimpan hanya jika selfie karyawan cocok.
 * Embedding tidak dikirim ke frontend.
 */
async function enrollEmployeeFace(userId, selfiePath) {
  const userResult = await pool.query(
    `SELECT id, photo, status, face_embedding, face_enrolled_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  if (!userResult.rows.length || userResult.rows[0].status !== true) {
    const error = new Error("Akun Employee Not Found atau tidak aktif.");
    error.code = "EMPLOYEE_NOT_ACTIVE";
    throw error;
  }

  const user = userResult.rows[0];

  if (user.face_embedding && user.face_enrolled_at) {
    const error = new Error("Registrasi wajah sudah dilakukan.");
    error.code = "FACE_ALREADY_ENROLLED";
    throw error;
  }

  if (!user.photo) {
    const error = new Error(
      "Foto referensi belum tersedia. Hubungi HR untuk memperbarui foto profil.",
    );
    error.code = "FACE_REFERENCE_MISSING";
    throw error;
  }

  if (!selfiePath) {
    throw new Error("Foto selfie registrasi tidak ditemukan.");
  }

  const referenceBuffer = await getReferencePhoto(user.photo);
  const selfieBuffer = await fs.readFile(selfiePath);

  const form = new FormData();
  form.append(
    "reference_photo",
    makeBlob(referenceBuffer, getMimeType(user.photo)),
    path.basename(user.photo) || "reference.jpg",
  );
  form.append(
    "selfie_photo",
    makeBlob(selfieBuffer, getMimeType(selfiePath)),
    path.basename(selfiePath) || "selfie.jpg",
  );

  const verification = await postFaceApi("/enroll-face", form);

  if (!verification.matched) {
    return {
      matched: false,
      distance: verification.distance,
      threshold: verification.threshold,
    };
  }

  const embedding = verification.embedding;

  if (
    !Array.isArray(embedding) ||
    embedding.length !== 512 ||
    !embedding.every(
      (value) => typeof value === "number" && Number.isFinite(value),
    )
  ) {
    throw new Error("Face API mengembalikan embedding yang tidak valid.");
  }

  // Simpan hanya jika foto referensi belum berubah saat proses berlangsung.
  const saveResult = await pool.query(
    `UPDATE users
     SET face_embedding = $1::jsonb,
         face_enrolled_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
       AND photo = $3
       AND status = TRUE
       AND face_embedding IS NULL
       AND face_enrolled_at IS NULL
     RETURNING face_enrolled_at`,
    [JSON.stringify(embedding), userId, user.photo],
  );

  if (!saveResult.rows.length) {
    const error = new Error(
      "Data foto atau status registrasi berubah. Muat ulang lalu coba kembali.",
    );
    error.code = "FACE_ENROLLMENT_CONFLICT";
    throw error;
  }

  return {
    matched: true,
    distance: verification.distance,
    threshold: verification.threshold,
    faceEnrolledAt: saveResult.rows[0].face_enrolled_at,
  };
}

/**
 * Verifikasi absensi menggunakan embedding yang sudah tersimpan.
 */
async function verifyAttendanceFace(userId, selfiePath) {
  const userResult = await pool.query(
    `SELECT face_embedding, face_enrolled_at
     FROM users
     WHERE id = $1 AND status = TRUE
     LIMIT 1`,
    [userId],
  );

  if (!userResult.rows.length) {
    const error = new Error("Akun karyawan tidak aktif atau tidak ditemukan.");
    error.code = "EMPLOYEE_NOT_ACTIVE";
    throw error;
  }

  const user = userResult.rows[0];

  if (!user.face_embedding || !user.face_enrolled_at) {
    const error = new Error("Registrasi wajah belum dilakukan.");
    error.code = "FACE_NOT_ENROLLED";
    throw error;
  }

  const selfieBuffer = await fs.readFile(selfiePath);

  const form = new FormData();
  form.append(
    "selfie_photo",
    makeBlob(selfieBuffer, getMimeType(selfiePath)),
    path.basename(selfiePath) || "selfie.jpg",
  );
  form.append("reference_embedding", JSON.stringify(user.face_embedding));

  const verification = await postFaceApi("/verify-enrolled-face", form);

  return {
    matched: Boolean(verification.matched),
    distance: verification.distance,
    threshold: verification.threshold,
  };
}

module.exports = {
  enrollEmployeeFace,
  verifyAttendanceFace,
  invalidateEmployeePhotoCache,
};
