const multer = require("multer");

const imageFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Format harus JPG, PNG, atau WEBP"));
  }

  cb(null, true);
};

const uploadNeon = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
});

module.exports = uploadNeon;