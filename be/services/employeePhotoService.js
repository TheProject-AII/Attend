
const path = require("path");
const fs = require("fs/promises");

async function getEmployeePhotoPath(photo) {
    if (!photo) {
        throw new Error("Pas foto karyawan belum terdaftar.");
    }

    // Hanya terima path dari folder foto HR
    const prefix = "/uploads/photos/";

    if (!photo.startsWith(prefix)) {
        throw new Error("Path pas foto karyawan tidak valid.");
    }

    const filename = photo.slice(prefix.length);

    // Cegah akses file di luar folder foto
    if (
        !filename ||
        filename === "." ||
        filename === ".." ||
        filename.includes("/") ||
        filename.includes("\\")
    ) {
        throw new Error("Nama file foto tidak valid.");
    }

    const photoPath = path.join(
        __dirname,
        "../uploads/photos",
        filename
    );

    await fs.access(photoPath);

    return photoPath;
}

module.exports = { getEmployeePhotoPath };
