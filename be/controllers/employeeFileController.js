const pool = require("../config/db");
const { getPrivateFileUrl } = require("../services/storageService");

const allowedFields = [
    "photo",
    "ktp",
    "npwp",
    "bpjs_kesehatan",
    "bpjs_tk",
    "kk",
];

exports.getEmployeeFile = async (req, res) => {
    try {
        const { id, field } = req.params;

        if (!allowedFields.includes(field)) {
            return res.status(400).json({
                success: false,
                message: "Jenis dokumen tidak valid",
            });
        }

        // Admin boleh mengakses dokumen karyawan.
        // Karyawan hanya boleh mengakses dokumen miliknya.
        const role = String(req.user.role || "")
            .trim()
            .toUpperCase();

        const isAdmin = ["ADMIN", "HR", "ADMIN HR"].includes(role);

        if (!isAdmin && String(req.user.id) !== String(id)) {
            return res.status(403).json({
                success: false,
                message: "Tidak memiliki akses",
            });
        }
        const result = await pool.query(
            `SELECT ${field} AS file_key FROM users WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0 || !result.rows[0].file_key) {
            return res.status(404).json({
                success: false,
                message: "Dokumen tidak ditemukan",
            });
        }

        const key = result.rows[0].file_key;

        // File lama masih menggunakan /uploads/
        if (key.startsWith("/uploads/")) {
            return res.status(409).json({
                success: false,
                message: "Dokumen masih tersimpan di storage lokal",
            });
        }

        const expectedPrefix = field === "photo" ? "photos/" : `${field}/`;

        if (!key.startsWith(expectedPrefix)) {
            return res.status(400).json({
                success: false,
                message: "Lokasi dokumen tidak valid",
            });
        }

        const url = await getPrivateFileUrl(key);

        return res.json({
            success: true,
            url,
            expiresIn: 300,
        });
    } catch (error) {
        console.error("GET EMPLOYEE FILE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Gagal mengambil dokumen",
        });
    }
};