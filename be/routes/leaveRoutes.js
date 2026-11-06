const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const upload = require("../middleware/leaveFile");

const leaveController = require("../controllers/leaveController");

// MASTER JENIS CUTI
router.get("/types", auth, leaveController.getTypes);

// PENGAJUAN CUTI / IZIN / SAKIT
router.post("/", auth, upload.single("attachment"), leaveController.create);

// RIWAYAT PENGAJUAN
router.get("/history", auth, leaveController.history);
console.log("LOADED LEAVE ROUTES:", __filename);
module.exports = router;
