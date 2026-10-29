const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Validasi header Authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan",
      });
    }

    // Validasi JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (!decoded || decoded.id == null || typeof decoded.role !== "string") {
      return res.status(401).json({
        success: false,
        message: "Data token tidak lengkap",
      });
    }

    const role = decoded.role.toLowerCase();

    // ==========================================
    // VALIDASI SESI KHUSUS EMPLOYEE
    // Tidak menggunakan batas idle 1 jam
    // ==========================================
    if (role === "employee") {
      if (!decoded.sessionId) {
        return res.status(401).json({
          success: false,
          message: "Sesi login tidak valid. Silakan login kembali.",
        });
      }

      const session = await pool.query(
        `
        SELECT 1
        FROM active_sessions
        WHERE user_id = $1
          AND session_id = $2
          AND expires_at > NOW()
        `,
        [decoded.id, decoded.sessionId],
      );

      if (session.rowCount === 0) {
        return res.status(401).json({
          success: false,
          message:
            "Sesi login sudah berakhir atau tidak aktif. Silakan login kembali.",
        });
      }
    }

    // ==========================================
    // AUTO LOGOUT KHUSUS ADMIN
    // Jika tidak ada aktivitas selama 1 jam
    // ==========================================
    if (role === "admin") {
      if (!decoded.sessionId) {
        return res.status(401).json({
          success: false,
          message: "Sesi login tidak valid. Silakan login kembali.",
        });
      }

      const session = await pool.query(
        `
        SELECT 1
        FROM active_sessions
        WHERE user_id = $1
          AND session_id = $2
          AND expires_at > NOW()
          AND last_activity_at > NOW() - INTERVAL '1 hour'
        `,
        [decoded.id, decoded.sessionId],
      );

      if (session.rowCount === 0) {
        return res.status(401).json({
          success: false,
          message:
            "Sesi berakhir karena tidak ada aktivitas. Silakan login kembali.",
        });
      }
    }

    // Simpan data user untuk digunakan controller
    req.user = decoded;

    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);

    if (
      err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError" ||
      err.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau sudah kedaluwarsa",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal memvalidasi autentikasi",
    });
  }
};

module.exports = authMiddleware;
