const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const accounts = [
  { email: "pride.hr@so-mak.com", name: "PRIDE HR", roleId: 2 },
  { email: "pride.finance@so-mak.com", name: "PRIDE Finance", roleId: 6 },
  { email: "pride.director@so-mak.com", name: "PRIDE Director", roleId: 7 },
];

const makeNik = () => `9999${crypto.randomInt(100000000000, 999999999999)}`;

const makePassword = () =>
  `PRIDE-${crypto.randomBytes(9).toString("base64url")}!`;

async function createAccounts() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_system_account
      BOOLEAN NOT NULL DEFAULT FALSE
    `);

    const credentials = [];

    for (const account of accounts) {
      const role = await client.query("SELECT id FROM roles WHERE id = $1", [
        account.roleId,
      ]);

      if (!role.rowCount) {
        throw new Error(`Role ID ${account.roleId} tidak ditemukan`);
      }

      const existing = await client.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
        [account.email],
      );

      // Jangan reset password jika akun sudah tersedia.
      if (existing.rowCount) {
        console.log(`Akun sudah tersedia: ${account.email}`);
        continue;
      }

      let nik;
      let nikExists;

      do {
        nik = makeNik();
        nikExists = await client.query("SELECT id FROM users WHERE nik = $1", [
          nik,
        ]);
      } while (nikExists.rowCount);

      const password = makePassword();
      const passwordHash = await bcrypt.hash(password, 12);

      await client.query(
        `INSERT INTO users (
          nik, name, email, password, role_id, status,
          leave_balance, employee_type, is_system_account,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,TRUE,0,'SYSTEM',TRUE,NOW(),NOW())`,
        [nik, account.name, account.email, passwordHash, account.roleId],
      );

      credentials.push({
        email: account.email,
        password,
        nik,
      });
    }

    await client.query("COMMIT");

    console.log("\n=== AKUN PRIDE ===");

    if (credentials.length) {
      credentials.forEach((item) => {
        console.log(`Email    : ${item.email}`);
        console.log(`Password : ${item.password}`);
        console.log(`NIK      : ${item.nik}`);
        console.log("-------------------------");
      });
    } else {
      console.log("Tidak ada akun baru yang dibuat.");
    }

    console.log("\nSimpan kredensial ini dengan aman.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("GAGAL:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

createAccounts();
