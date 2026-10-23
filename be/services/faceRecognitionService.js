const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");

const {
    getEmployeePhotoBuffer,
} = require("./employeePhotoService");

const FACE_API_URL = process.env.FACE_API_URL;

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";

    return "image/jpeg";
}

async function verifyEmployeeFace(
    referenceBuffer,
    referenceKey,
    selfiePath
) {
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
        path.basename(referenceKey)
    );

    form.append(
        "selfie_photo",
        new Blob([selfieBuffer], {
            type: getMimeType(selfiePath),
        }),
        path.basename(selfiePath)
    );

    const response = await fetch(
        `${FACE_API_URL.replace(/\/$/, "")}/verify-face`,
        {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60000),
        }
    );

    if (!response.ok) {
        throw new Error(
            `Face Recognition Service gagal: HTTP ${response.status}`
        );
    }

    const result = await response.json();

    if (result.success !== true) {
        throw new Error("Verifikasi wajah gagal.");
    }

    return {
        matched: result.matched === true,
        distance: result.distance,
        threshold: result.threshold,
    };
}

async function verifyAttendanceFace(userId, selfiePath) {
    const result = await pool.query(
        "SELECT photo FROM users WHERE id = $1",
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error("Karyawan tidak ditemukan.");
    }

    const referenceKey = result.rows[0].photo;

    const referenceBuffer = await getEmployeePhotoBuffer(
        referenceKey
    );

    return verifyEmployeeFace(
        referenceBuffer,
        referenceKey,
        selfiePath
    );
}

module.exports = {
    verifyEmployeeFace,
    verifyAttendanceFace,
};