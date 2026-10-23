
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Lokasi penyimpanan sementara
const uploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "hris-uploads", "leave")
  : path.join(__dirname, "../uploads", "leave");

// Buat folder jika belum tersedia
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

module.exports = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter(req, file, cb) {
    const allowed = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Format file tidak didukung."));
    }

    cb(null, true);
  },
});
