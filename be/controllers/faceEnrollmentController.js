const fs = require("fs/promises");
const { enrollEmployeeFace } = require("../services/faceRecognitionService");

const restrictedRoles = new Set(["ADMIN", "HR", "ADMIN HR"]);

exports.enroll = async (req, res) => {
  try {
    const role = String(req.user?.role || "")
      .trim()
      .toUpperCase();

    if (restrictedRoles.has(role)) {
      return res.status(403).json({
        success: false,
        message: "Registrasi wajah hanya untuk akun karyawan.",
      });
    }

    if (!req.file?.path) {
      return res.status(400).json({
        success: false,
        message: "Foto selfie wajib diambil.",
      });
    }

    const result = await enrollEmployeeFace(req.user.id, req.file.path);

    if (!result.matched) {
      return res.status(403).json({
        success: false,
        code: "FACE_NOT_MATCHED",
        message:
          "Wajah tidak cocok dengan foto referensi HR. Silakan coba kembali.",
      });
    }

    return res.json({
      success: true,
      message: "Registrasi wajah berhasil.",
      data: {
        face_enrolled: true,
        face_enrolled_at: result.faceEnrolledAt,
      },
    });
  } catch (err) {
    console.error("FACE ENROLLMENT ERROR:", err);

    const errors = {
      FACE_NOT_ENROLLED: [409, "Registrasi wajah belum dilakukan."],
      FACE_ALREADY_ENROLLED: [409, "Registrasi wajah sudah dilakukan."],
      FACE_REFERENCE_MISSING: [
        400,
        "Foto referensi belum tersedia. Hubungi HR.",
      ],
      FACE_ENROLLMENT_CONFLICT: [
        409,
        "Data registrasi berubah. Silakan muat ulang dan coba lagi.",
      ],
      EMPLOYEE_NOT_ACTIVE: [403, "Akun tidak aktif atau tidak ditemukan."],
      FACE_VALIDATION_FAILED: [
        422,
        err.message || "Foto wajah tidak lolos validasi.",
      ],
    };

    const knownError = errors[err.code];

    if (knownError) {
      return res.status(knownError[0]).json({
        success: false,
        code: err.code,
        message: knownError[1],
      });
    }

    if (err.status === 422) {
      return res.status(422).json({
        success: false,
        code: err.code || "FACE_VALIDATION_FAILED",
        message: err.message,
      });
    }

    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(503).json({
        success: false,
        code: "FACE_AI_UNAVAILABLE",
        message: "Face Recognition sedang sibuk. Silakan coba lagi.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal melakukan registrasi wajah.",
    });
  } finally {
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Gagal menghapus selfie sementara:", err);
        }
      }
    }
  }
};
