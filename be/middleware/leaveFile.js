const multer = require("multer");

const storage = multer.memoryStorage();

module.exports = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Format file tidak didukung."));
    }

    cb(null, true);
  },
});
