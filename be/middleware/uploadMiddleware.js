const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Vercel hanya mengizinkan penulisan sementara di /tmp
const baseUploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "hris-uploads")
  : path.join(__dirname, "../uploads");

// Folder upload
const photoDir = path.join(baseUploadDir, "photos");
const ktpDir = path.join(baseUploadDir, "ktp");
const npwpDir = path.join(baseUploadDir, "npwp");
const bpjsKesehatanDir = path.join(baseUploadDir, "bpjs_kesehatan");
const bpjsTkDir = path.join(baseUploadDir, "bpjs_tk");
const kkDir = path.join(baseUploadDir, "kk");
const announcementDir = path.join(baseUploadDir, "announcements");

const employeeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const directories = {
      photo: photoDir,
      ktp: ktpDir,
      npwp: npwpDir,
      bpjs_kesehatan: bpjsKesehatanDir,
      bpjs_tk: bpjsTkDir,
      kk: kkDir,
    };

    const destination = directories[file.fieldname];

    if (!destination) {
      return cb(new Error("Field upload tidak dikenal"));
    }

    cb(null, destination);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const filename = `${file.fieldname}-${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${ext}`;

    cb(null, filename);
  },
});
// Buat folder otomatis kalau belum ada
fs.mkdirSync(photoDir, { recursive: true });
fs.mkdirSync(ktpDir, { recursive: true });
fs.mkdirSync(npwpDir, { recursive: true });
fs.mkdirSync(bpjsKesehatanDir, { recursive: true });
fs.mkdirSync(bpjsTkDir, { recursive: true });
fs.mkdirSync(kkDir, { recursive: true });
fs.mkdirSync(announcementDir, { recursive: true });
// Storage foto
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, photoDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const filename = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    cb(null, filename);
  },
});

// Storage KTP
const ktpStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ktpDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const filename = `ktp-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    cb(null, filename);
  },
});

// Filter file
const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format foto harus JPG, PNG, atau WEBP"));
  }
};

// Upload foto
const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Upload KTP
const uploadKtp = multer({
  storage: ktpStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Storage Announcement - sementara di memory sebelum upload ke Neon
const announcementStorage = multer.memoryStorage();

const uploadAnnouncement = multer({
  storage: announcementStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("image");

const uploadEmployee = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
});

module.exports = {
  uploadPhoto,
  uploadEmployee,
  uploadKtp,
  uploadAnnouncement,
};
