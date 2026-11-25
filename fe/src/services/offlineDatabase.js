import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";

const DB_NAME = "hris_offline";
const DB_VERSION = 1;

const sqlite = new SQLiteConnection(CapacitorSQLite);

let dbInstance = null;
let dbInitializing = null;

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS offline_attendance (
    id TEXT PRIMARY KEY NOT NULL,
    employee_id TEXT NOT NULL,
    attendance_action TEXT NOT NULL
      CHECK (attendance_action IN ('CHECK_IN', 'CHECK_OUT')),
    occurred_at TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    gps_accuracy REAL,
    is_mock_location INTEGER DEFAULT 0,
    attendance_type TEXT,
    notes TEXT,
    photo_path TEXT,
    sync_status TEXT NOT NULL DEFAULT 'PENDING_SYNC',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_offline_attendance_sync
  ON offline_attendance(sync_status, created_at);

  CREATE INDEX IF NOT EXISTS idx_offline_attendance_employee
  ON offline_attendance(employee_id, occurred_at);

  CREATE TABLE IF NOT EXISTS offline_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

export const initializeOfflineDatabase = async () => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error(
      "Offline attendance database hanya tersedia di aplikasi Android/iOS.",
    );
  }

  if (dbInstance) return dbInstance;
  if (dbInitializing) return dbInitializing;

  dbInitializing = (async () => {
    try {
      await sqlite.checkConnectionsConsistency();

      const connectionExists = await sqlite.isConnection(DB_NAME, false);

      let db;

      if (connectionExists.result) {
        db = await sqlite.retrieveConnection(DB_NAME, false);
      } else {
        db = await sqlite.createConnection(
          DB_NAME,
          false,
          "no-encryption",
          DB_VERSION,
        );
      }

      const isOpen = await db.isDBOpen();

      if (!isOpen.result) {
        await db.open();
      }

      await db.execute(CREATE_TABLES_SQL);

      dbInstance = db;

      console.info("[OFFLINE DB] Database berhasil diinisialisasi.");

      return dbInstance;
    } catch (error) {
      dbInstance = null;

      console.error("[OFFLINE DB] Gagal menginisialisasi database:", error);

      throw error;
    } finally {
      dbInitializing = null;
    }
  })();

  return dbInitializing;
};

export const getOfflineDatabase = async () => {
  if (dbInstance) return dbInstance;

  return initializeOfflineDatabase();
};

export const closeOfflineDatabase = async () => {
  try {
    if (!dbInstance) return;

    await dbInstance.close();
    dbInstance = null;

    console.info("[OFFLINE DB] Database berhasil ditutup.");
  } catch (error) {
    console.error("[OFFLINE DB] Gagal menutup database:", error);
    throw error;
  }
};

export const getOfflineDatabaseStatus = async () => {
  try {
    const db = await getOfflineDatabase();
    const result = await db.query(
      "SELECT COUNT(*) AS total FROM offline_attendance",
    );

    return {
      available: true,
      totalTransactions: Number(result.values?.[0]?.total || 0),
    };
  } catch (error) {
    return {
      available: false,
      totalTransactions: 0,
      error: error.message,
    };
  }
};

export default {
  initializeOfflineDatabase,
  getOfflineDatabase,
  closeOfflineDatabase,
  getOfflineDatabaseStatus,
};
