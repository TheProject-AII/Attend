
const fs = require("fs/promises");
const path = require("path");

const FACE_API_URL =
    process.env.FACE_API_URL ||
    "http://127.0.0.1:8001";

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";

    return "image/jpeg";
}

async function verifyEmployeeFace(
    referencePath,
    selfiePath
) {
    const [referenceBuffer, selfieBuffer] =
        await Promise.all([
            fs.readFile(referencePath),
            fs.readFile(selfiePath),
        ]);

    const form = new FormData();

    form.append(
        "reference_photo",
        new Blob([referenceBuffer], {
            type: getMimeType(referencePath),
        }),
        path.basename(referencePath)
    );

    form.append(
        "selfie_photo",
        new Blob([selfieBuffer], {
            type: getMimeType(selfiePath),
        }),
        path.basename(selfiePath)
    );

    const response = await fetch(
        `${FACE_API_URL}/verify-face`,
        {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60000),
        }
    );

    const result = await response.json();

    if (!response.ok || result.success !== true) {
        throw new Error(
            typeof result.detail === "string"
                ? result.detail
                : "Verifikasi wajah gagal"
        );
    }

    return {
        matched: result.matched === true,
        distance: result.distance,
        threshold: result.threshold,
    };
}


const pool = require("./../config/db");
const {
    getEmployeePhotoPath,
} = require("./employeePhotoService");

async function verifyAttendanceFace(userId, selfiePath) {
    const result = await pool.query(
        "SELECT photo FROM users WHERE id = $1",
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error("Karyawan tidak ditemukan.");
    }

    const referencePath = await getEmployeePhotoPath(
        result.rows[0].photo
    );

    return verifyEmployeeFace(referencePath, selfiePath);
}


module.exports = {
    verifyEmployeeFace,
    verifyAttendanceFace,
};
