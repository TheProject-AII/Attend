const multer = require("multer");

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const uploadBusinessTrip = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error("Format lampiran harus PDF, JPG, JPEG, PNG, atau WEBP."),
      );
    }

    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

module.exports = uploadBusinessTrip;
