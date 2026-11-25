import { Filesystem, Directory } from "@capacitor/filesystem";

const PHOTO_FOLDER = "offline-attendance";

const generateFileName = () => {
  if (globalThis.crypto?.randomUUID) {
    return `${globalThis.crypto.randomUUID()}.jpg`;
  }

  return `attendance-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;
};

const extractBase64 = (imageData) => {
  if (!imageData || typeof imageData !== "string") {
    throw new Error("Data foto tidak valid.");
  }

  const parts = imageData.split(",");

  if (parts.length < 2 || !parts[0].includes("base64")) {
    throw new Error("Format foto harus berupa Base64 Data URL.");
  }

  return parts[1];
};

/**
 * Simpan foto absensi ke penyimpanan lokal perangkat.
 * Mengembalikan relative path untuk disimpan di SQLite.
 */
export const saveOfflineAttendancePhoto = async (imageData) => {
  const base64Data = extractBase64(imageData);
  const fileName = generateFileName();
  const path = `${PHOTO_FOLDER}/${fileName}`;

  try {
    const result = await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Data,
      recursive: true,
    });

    return {
      path,
      uri: result.uri,
      fileName,
    };
  } catch (error) {
    console.error("[OFFLINE PHOTO] Gagal menyimpan foto:", error);
    throw new Error(`Gagal menyimpan foto absensi: ${error.message}`);
  }
};

/**
 * Membaca foto lokal untuk proses sinkronisasi ke server.
 */
export const readOfflineAttendancePhoto = async (path) => {
  if (!path) {
    throw new Error("Path foto tidak tersedia.");
  }

  try {
    const result = await Filesystem.readFile({
      path,
      directory: Directory.Data,
    });

    return result.data;
  } catch (error) {
    console.error("[OFFLINE PHOTO] Gagal membaca foto:", error);
    throw new Error(`Gagal membaca foto absensi: ${error.message}`);
  }
};

/**
 * Menghapus foto hanya setelah server mengonfirmasi
 * transaksi absensi berhasil diproses.
 */
export const deleteOfflineAttendancePhoto = async (path) => {
  if (!path) return;

  try {
    await Filesystem.deleteFile({
      path,
      directory: Directory.Data,
    });
  } catch (error) {
    console.error("[OFFLINE PHOTO] Gagal menghapus foto:", error);
    throw error;
  }
};

export default {
  saveOfflineAttendancePhoto,
  readOfflineAttendancePhoto,
  deleteOfflineAttendancePhoto,
};
