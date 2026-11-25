import { getOfflineDatabase } from "./offlineDatabase";
import {
  readOfflineAttendancePhoto,
  deleteOfflineAttendancePhoto,
} from "./offlinePhotoService";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://hris.so-mak.com/api"
).replace(/\/+$/, "");

const SYNC_ENDPOINT = `${API_BASE_URL}/attendance/sync-offline`;

let isSyncing = false;

const createTransactionId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const normalizeBoolean = (value) => (value ? 1 : 0);

const validateAttendance = (payload) => {
  if (!payload) {
    throw new Error("Data absensi tidak boleh kosong.");
  }

  if (!payload.employeeId) {
    throw new Error("Employee ID wajib diisi.");
  }

  if (!["CHECK_IN", "CHECK_OUT"].includes(payload.action)) {
    throw new Error("Action harus CHECK_IN atau CHECK_OUT.");
  }

  if (!payload.occurredAt) {
    throw new Error("Waktu absensi wajib diisi.");
  }
};

const normalizeOccurredAt = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Waktu absensi tidak valid.");
  }

  return date.toISOString();
};

const base64ToBlob = (base64, mimeType = "image/jpeg") => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
};

const getToken = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Token login tidak ditemukan. Silakan login kembali.");
  }

  return token;
};

/**
 * SIMPAN ABSENSI OFFLINE
 */
export const saveOfflineAttendance = async (payload) => {
  validateAttendance(payload);

  const db = await getOfflineDatabase();
  const id = payload.id || createTransactionId();

  const sql = `
    INSERT INTO offline_attendance (
      id,
      employee_id,
      attendance_action,
      occurred_at,
      latitude,
      longitude,
      gps_accuracy,
      is_mock_location,
      attendance_type,
      notes,
      photo_path,
      sync_status,
      retry_count,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_SYNC', 0, ?, ?)
  `;

  const now = new Date().toISOString();

  await db.run(sql, [
    id,
    String(payload.employeeId),
    payload.action,
    normalizeOccurredAt(payload.occurredAt),
    payload.latitude ?? null,
    payload.longitude ?? null,
    payload.gpsAccuracy ?? null,
    normalizeBoolean(payload.isMockLocation),
    payload.attendanceType ?? "OFFICE",
    payload.notes ?? null,
    payload.photoPath ?? null,
    now,
    now,
  ]);

  return {
    id,
    syncStatus: "PENDING_SYNC",
  };
};

/**
 * AMBIL ANTREAN ABSENSI
 */
export const getPendingOfflineAttendance = async (limit = 50) => {
  const db = await getOfflineDatabase();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));

  const result = await db.query(
    `
      SELECT *
      FROM offline_attendance
      WHERE sync_status IN ('PENDING_SYNC', 'SYNC_FAILED')
      ORDER BY occurred_at ASC
      LIMIT ?
    `,
    [safeLimit],
  );

  return result.values || [];
};

/**
 * AMBIL ABSENSI BERDASARKAN ID
 */
export const getOfflineAttendanceById = async (id) => {
  const db = await getOfflineDatabase();

  const result = await db.query(
    `SELECT * FROM offline_attendance WHERE id = ? LIMIT 1`,
    [id],
  );

  return result.values?.[0] || null;
};

/**
 * UPDATE STATUS SINKRONISASI
 */
export const updateOfflineAttendanceStatus = async (
  id,
  status,
  errorMessage = null,
) => {
  const allowedStatuses = [
    "PENDING_SYNC",
    "SYNCING",
    "SYNCED",
    "SYNC_FAILED",
    "NEEDS_REVIEW",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Status sinkronisasi tidak valid.");
  }

  const db = await getOfflineDatabase();

  await db.run(
    `
      UPDATE offline_attendance
      SET
        sync_status = ?,
        retry_count = retry_count + ?,
        last_error = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      status,
      status === "SYNC_FAILED" ? 1 : 0,
      errorMessage,
      new Date().toISOString(),
      id,
    ],
  );
};

/**
 * KIRIM SATU TRANSAKSI KE BACKEND
 */
const sendOfflineAttendance = async (item) => {
  if (!item.photo_path) {
    throw new Error("Foto absensi tidak ditemukan.");
  }

  const base64 = await readOfflineAttendancePhoto(item.photo_path);

  if (!base64) {
    throw new Error("Foto offline gagal dibaca.");
  }

  const formData = new FormData();

  formData.append("transaction_id", item.id);
  formData.append("action", item.attendance_action);
  formData.append("occurred_at", normalizeOccurredAt(item.occurred_at));
  formData.append("latitude", String(item.latitude ?? ""));
  formData.append("longitude", String(item.longitude ?? ""));

  formData.append(
    "is_mock_location",
    String(Boolean(Number(item.is_mock_location))),
  );

  formData.append("attendance_type", item.attendance_type || "OFFICE");
  formData.append("notes", item.notes || "");

  const photoBlob = base64ToBlob(base64, "image/jpeg");

  formData.append("photo", photoBlob, `attendance-${item.id}.jpg`);

  const response = await fetch(SYNC_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
    body: formData,
  });

  let result;

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok && response.status !== 202) {
    const error = new Error(result.message || `HTTP Error ${response.status}`);

    error.status = response.status;
    error.response = result;

    throw error;
  }

  return result;
};

/**
 * SINKRONISASI SEMUA ANTREAN OFFLINE
 *
 * Urutan berdasarkan occurred_at.
 * Check-in akan dikirim sebelum check-out.
 */
export const syncPendingOfflineAttendance = async () => {
  if (isSyncing) {
    return {
      success: false,
      message: "Sinkronisasi sedang berjalan.",
    };
  }

  if (!navigator.onLine) {
    return {
      success: false,
      message: "Tidak ada koneksi internet.",
    };
  }

  isSyncing = true;

  const summary = {
    total: 0,
    synced: 0,
    failed: 0,
    needsReview: 0,
  };

  try {
    const pending = await getPendingOfflineAttendance(200);

    summary.total = pending.length;

    if (!pending.length) {
      return {
        success: true,
        message: "Tidak ada antrean absensi.",
        summary,
      };
    }

    for (const item of pending) {
      if (!navigator.onLine) {
        break;
      }

      try {
        await updateOfflineAttendanceStatus(item.id, "SYNCING");

        const result = await sendOfflineAttendance(item);

        // Server meminta pemeriksaan HR.
        if (result.sync_status === "NEEDS_REVIEW") {
          await updateOfflineAttendanceStatus(
            item.id,
            "NEEDS_REVIEW",
            result.message || "Menunggu pemeriksaan HR.",
          );

          summary.needsReview++;
          continue;
        }

        // Server berhasil menyimpan transaksi.
        if (result.success && result.sync_status === "SYNCED") {
          await updateOfflineAttendanceStatus(item.id, "SYNCED");

          // Hapus foto lokal setelah server mengonfirmasi sukses.
          if (item.photo_path) {
            try {
              await deleteOfflineAttendancePhoto(item.photo_path);
            } catch (photoError) {
              console.error(
                "[OFFLINE SYNC] Gagal menghapus foto lokal:",
                photoError,
              );
            }
          }

          summary.synced++;
          continue;
        }

        throw new Error(
          result.message || "Server belum mengonfirmasi sinkronisasi.",
        );
      } catch (error) {
        console.error(
          `[OFFLINE SYNC] Gagal transaksi ${item.id}:`,
          error.response || error,
        );

        await updateOfflineAttendanceStatus(
          item.id,
          "SYNC_FAILED",
          error.message || "Sinkronisasi gagal.",
        );

        summary.failed++;

        // Jika masalah jaringan/server, jangan lanjutkan antrean.
        if (!error.status || error.status >= 500) {
          break;
        }
      }
    }

    return {
      success: summary.failed === 0,
      message: "Proses sinkronisasi selesai.",
      summary,
    };
  } catch (error) {
    console.error("[OFFLINE SYNC] ERROR:", error);

    return {
      success: false,
      message: error.message,
      summary,
    };
  } finally {
    isSyncing = false;
  }
};

/**
 * RINGKASAN ANTREAN OFFLINE
 */
export const getOfflineAttendanceSummary = async () => {
  const db = await getOfflineDatabase();

  const result = await db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN sync_status = 'PENDING_SYNC' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN sync_status = 'SYNCING' THEN 1 ELSE 0 END) AS syncing,
      SUM(CASE WHEN sync_status = 'SYNCED' THEN 1 ELSE 0 END) AS synced,
      SUM(CASE WHEN sync_status = 'SYNC_FAILED' THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN sync_status = 'NEEDS_REVIEW' THEN 1 ELSE 0 END) AS needs_review
    FROM offline_attendance
  `);

  const row = result.values?.[0] || {};

  return {
    total: Number(row.total || 0),
    pending: Number(row.pending || 0),
    syncing: Number(row.syncing || 0),
    synced: Number(row.synced || 0),
    failed: Number(row.failed || 0),
    needsReview: Number(row.needs_review || 0),
  };
};

/**
 * HAPUS DATA YANG SUDAH BERHASIL DISINKRONKAN
 */
export const deleteSyncedOfflineAttendance = async (id) => {
  const db = await getOfflineDatabase();

  await db.run(
    `
      DELETE FROM offline_attendance
      WHERE id = ? AND sync_status = 'SYNCED'
    `,
    [id],
  );
};

export default {
  saveOfflineAttendance,
  getPendingOfflineAttendance,
  getOfflineAttendanceById,
  updateOfflineAttendanceStatus,
  syncPendingOfflineAttendance,
  getOfflineAttendanceSummary,
  deleteSyncedOfflineAttendance,
};
