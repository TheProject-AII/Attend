const hrgaMiddleware = (req, res, next) => {
  const role = String(req.user?.role || "")
    .trim()
    .toLowerCase();

  const allowedRoles = ["admin hr", "hr"];

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Anda tidak memiliki akses ke riwayat cuti dan izin.",
    });
  }

  next();
};

module.exports = hrgaMiddleware;
