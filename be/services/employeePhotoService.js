const {
    downloadFromStorage,
} = require("./storageService");

async function getEmployeePhotoBuffer(photo) {
    if (!photo) {
        throw new Error("Pas foto karyawan belum terdaftar.");
    }

    if (photo.startsWith("/uploads/")) {
        throw new Error(
            "Pas foto masih menggunakan penyimpanan lama. Silakan upload ulang melalui HR."
        );
    }

    if (!/^photos\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(photo)) {
        throw new Error("Storage key pas foto tidak valid.");
    }

    return downloadFromStorage(photo);
}

module.exports = {
    getEmployeePhotoBuffer,
};