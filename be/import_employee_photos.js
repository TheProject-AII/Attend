require("dotenv").config();

const fs = require("fs");
const path = require("path");

const pool = require("./config/db");
const {
  uploadToStorage,
  deleteFromStorage,
} = require("./services/storageService");

const PHOTO_DIR = path.resolve(__dirname, "../photos-import");
const EXECUTE = process.argv.includes("--execute");

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Pemetaan eksplisit berdasarkan hasil pemeriksaan sebelumnya.
// Cecep sengaja tidak dimasukkan.
const PHOTO_MAP = {
  "Adinda Maharani.jpg": 25,
  "Aldhi Febriansyah Pratama.jpeg": 26,
  "Arya Hertyan Agustin.jpeg": 27,
  "Deni Syahreza.jpeg": 28,
  "Devina Nurmaharani.jpeg": 29,
  "Dewi Safitria Dewi.jpeg": 30,
  "Fathin Dwi Saputri.jpeg": 31,
  "Fiki Zulfadilah.jpeg": 32,
  "Fitria Armini Santoso.jpeg": 33,
  "Guntur Alkahfi Puspiadi.jpeg": 34,
  "Irfan Siregar.jpeg": 40,
  "Irhandy Ardiansyah.jpeg": 35,
  "Leon Fittipalidi.jpeg": 36,
  "Lourentius Erick Indra Saputra.jpeg": 37,
  "Nuri Stiyowati.jpeg": 42,
  "Rika Wulandari.jpeg": 43,
  "Robiatul Husna Mulya Kusumah.jpeg.jpg": 45,
  "Wienda Herawati.jpeg": 46,
};

async function main() {
  if (!fs.existsSync(PHOTO_DIR)) {
    throw new Error(`Folder foto tidak ditemukan: ${PHOTO_DIR}`);
  }

  const files = fs
    .readdirSync(PHOTO_DIR)
    .filter((name) => fs.statSync(path.join(PHOTO_DIR, name)).isFile());

  const mappedFiles = new Set(Object.keys(PHOTO_MAP));
  const missingFiles = Object.keys(PHOTO_MAP).filter(
    (name) => !files.includes(name),
  );

  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Folder foto: ${PHOTO_DIR}`);
  console.log(`Total file dalam folder: ${files.length}\n`);

  // Pastikan ID tujuan benar-benar ada dan nama file terpetakan
  // tidak diarahkan ke ID karyawan yang salah.
  const ids = [...new Set(Object.values(PHOTO_MAP))];

  const result = await pool.query(
    `SELECT id, name, photo FROM users WHERE id = ANY($1::int[])`,
    [ids],
  );

  const employeeById = new Map(
    result.rows.map((employee) => [Number(employee.id), employee]),
  );

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of files) {
    if (!mappedFiles.has(filename)) {
      console.log(
        filename === "Cecep Suprihat.jpeg"
          ? `[LEWATI - DIKONFIRMASI] ${filename}`
          : `[LEWATI - BELUM DIPETAKAN] ${filename}`,
      );
      skipped++;
      continue;
    }

    const employeeId = PHOTO_MAP[filename];
    const employee = employeeById.get(employeeId);

    if (!employee) {
      console.log(`[GAGAL VALIDASI] ID ${employeeId} tidak ditemukan`);
      failed++;
      continue;
    }

    const ext = path.extname(filename).toLowerCase();

    if (!MIME_TYPES[ext]) {
      console.log(`[GAGAL VALIDASI] Format tidak didukung: ${filename}`);
      failed++;
      continue;
    }

    const fullPath = path.join(PHOTO_DIR, filename);

    if (fs.statSync(fullPath).size === 0) {
      console.log(`[GAGAL VALIDASI] File kosong: ${filename}`);
      failed++;
      continue;
    }

    if (!EXECUTE) {
      console.log(
        `[DRY-RUN] ${filename} -> ID ${employee.id} (${employee.name})` +
          (employee.photo ? " [SUDAH ADA FOTO]" : ""),
      );
      success++;
      continue;
    }

    let uploadedKey = null;

    try {
      // Upload foto baru tanpa menghapus foto lama.
      uploadedKey = await uploadToStorage(
        {
          buffer: fs.readFileSync(fullPath),
          originalname: filename,
          mimetype: MIME_TYPES[ext],
        },
        "photos",
      );

      // Periksa kolom Face Recognition yang benar-benar tersedia.
      const columnsResult = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'users'
      `);

      const columns = new Set(columnsResult.rows.map((row) => row.column_name));

      const updates = ["photo = $1"];
      const values = [uploadedKey];

      // Reset enrollment hanya jika kolomnya tersedia.
      for (const column of ["face_embedding", "face_enrolled_at"]) {
        if (columns.has(column)) {
          updates.push(`${column} = NULL`);
        }
      }

      values.push(employee.id);

      const updated = await pool.query(
        `UPDATE users
         SET ${updates.join(", ")}
         WHERE id = $${values.length}
         RETURNING id`,
        values,
      );

      if (updated.rowCount !== 1) {
        throw new Error("Update tidak menghasilkan tepat satu karyawan");
      }

      console.log(
        `[BERHASIL] ${filename} -> ID ${employee.id} (${employee.name})`,
      );
      success++;
      uploadedKey = null; // Jangan hapus file yang sudah terpasang.
    } catch (error) {
      if (uploadedKey) {
        await deleteFromStorage(uploadedKey).catch((cleanupError) => {
          console.error(
            `[PERINGATAN] Gagal membersihkan upload ${uploadedKey}:`,
            cleanupError.message,
          );
        });
      }

      console.error(`[GAGAL] ${filename}: ${error.message}`);
      failed++;
    }
  }

  console.log("\n===== RINGKASAN =====");
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Cocok/berhasil: ${success}`);
  console.log(`Dilewati: ${skipped}`);
  console.log(`Gagal: ${failed}`);

  if (missingFiles.length) {
    console.log("\nFile yang terdaftar di pemetaan tetapi tidak ditemukan:");
    missingFiles.forEach((name) => console.log(`- ${name}`));
  }

  if (!EXECUTE) {
    console.log("\nBelum ada upload atau perubahan database.");
    console.log("Periksa seluruh pasangan nama file dan ID sebelum execute.");
  }
}

main()
  .catch((error) => {
    console.error("Import dihentikan:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
