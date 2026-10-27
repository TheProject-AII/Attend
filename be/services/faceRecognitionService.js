const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");

const { getEmployeePhotoBuffer } = require("./employeePhotoService");

const FACE_API_URL = process.env.FACE_API_URL;
const FACE_API_KEY = process.env.FACE_API_KEY;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";

  return "image/jpeg";
}

async function verifyEmployeeFace(referenceBuffer, referenceKey, selfiePath) {
  if (!FACE_API_URL) {
    throw new Error("FACE_API_URL belum dikonfigurasi.");
  }

  const selfieBuffer = await fs.readFile(selfiePath);

  const form = new FormData();

  form.append(
    "reference_photo",
    new Blob([referenceBuffer], {
      type: getMimeType(referenceKey),
    }),
    path.basename(referenceKey),
  );

  form.append(
    "selfie_photo",
    new Blob([selfieBuffer], {
      type: getMimeType(selfiePath),
    }),
    path.basename(selfiePath),
  );

  if (!FACE_API_KEY) {
    throw new Error("FACE_API_KEY belum dikonfigurasi.");
  }

  const response = await fetch(
    `${FACE_API_URL.replace(/\/$/, "")}/verify-face`,
    {
      method: "POST",
      headers: {
        "X-Face-API-Key": FACE_API_KEY,
      },
      body: form,
      signal: AbortSignal.timeout(60000),
    },
  );
  const result = await response.json();

  if (!response.ok) {
    console.error("Face API HTTP Status:", response.status);
    console.error("Face API Error:", result);

    throw new Error(
      result?.detail ||
        result?.message ||
        `Face Recognition Service gagal: HTTP ${response.status}`,
    );
  }

  console.log("FACE API RESULT:", JSON.stringify(result));

  if (!result || typeof result !== "object") {
    throw new Error(
      "Face Recognition Service mengembalikan JSON null/tidak valid.",
    );
  }

  if (result.success !== true) {
    throw new Error(
      result.message || result.detail || "Verifikasi wajah gagal.",
    );
  }

  return {
    matched: result.matched === true,
    distance: result.distance,
    threshold: result.threshold,
  };
}

async function verifyAttendanceFace(userId, selfiePath) {
  const startedAt = performance.now();

  const result = await pool.query("SELECT photo FROM users WHERE id = $1", [
    userId,
  ]);

  console.log(
    `[FACE] Query foto karyawan: ${(
      (performance.now() - startedAt) /
      1000
    ).toFixed(2)} detik`,
  );

  if (result.rows.length === 0) {
    throw new Error("Karyawan tidak ditemukan.");
  }

  const referenceKey = result.rows[0].photo;

  if (!referenceKey) {
    throw new Error("Foto referensi karyawan belum tersedia.");
  }

  const storageStart = performance.now();

  const referenceBuffer = await getEmployeePhotoBuffer(referenceKey);

  console.log(
    `[FACE] Download foto referensi: ${(
      (performance.now() - storageStart) /
      1000
    ).toFixed(2)} detik`,
  );

  const verifyStart = performance.now();

  const verification = await verifyEmployeeFace(
    referenceBuffer,
    referenceKey,
    selfiePath,
  );

  console.log(
    `[FACE] Request FastAPI: ${(
      (performance.now() - verifyStart) /
      1000
    ).toFixed(2)} detik`,
  );

  console.log(
    `[FACE] Total verifikasi: ${(
      (performance.now() - startedAt) /
      1000
    ).toFixed(2)} detik`,
  );

  return verification;
}

module.exports = {
  verifyEmployeeFace,
  verifyAttendanceFace,
};
