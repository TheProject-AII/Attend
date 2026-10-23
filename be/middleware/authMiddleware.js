const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

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

        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"],
        });

        if (
            !decoded ||
            decoded.id == null ||
            typeof decoded.role !== "string"
        ) {
            return res.status(401).json({
                success: false,
                message: "Data token tidak lengkap",
            });
        }

        req.user = decoded;

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Token tidak valid",
        });
    }
};

module.exports = authMiddleware;