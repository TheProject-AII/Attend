const express = require("express");
const router = express.Router();

router.get("/android", (req, res) => {
  res.json({
    success: true,
    version: process.env.ANDROID_VERSION || "1.0.5",
    versionCode: Number(process.env.ANDROID_VERSION_CODE || 6),
    forceUpdate: process.env.ANDROID_FORCE_UPDATE === "true",
    downloadUrl: "https://appdropper.io/pride",
    releaseNotes:
      process.env.ANDROID_RELEASE_NOTES ||
      "Perbaikan fitur dan peningkatan performa HRIS.",
  });
});

module.exports = router;
