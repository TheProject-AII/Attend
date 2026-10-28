require("dotenv").config();

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diatur di file .env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
  options: "-c timezone=Asia/Jakarta",
});

pool.on("connect", () => {
  console.log("✅ Neon PostgreSQL Connected");
  console.log("🌏 Timezone: Asia/Jakarta");
});

pool.on("error", (err) => {
  console.error("❌ Neon PostgreSQL Pool Error:", err);
});

module.exports = pool;
