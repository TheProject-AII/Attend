const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const os = require("os");

const uploadDir = process.env.VERCEL
    ? path.join(os.tmpdir(), "hris-uploads", "attendance")
    : path.join(__dirname, "../uploads", "attendance");

// Buat folder jika belum ada
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        cb(null, `${randomUUID()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error("Foto harus berformat JPG, PNG, atau WebP"),
            false
        );
    }
};

module.exports = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});