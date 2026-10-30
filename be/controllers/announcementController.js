const pool = require("../config/db");

// Sesuaikan path ini dengan lokasi file helper Neon Storage kamu
const {
  uploadToStorage,
  getPrivateFileUrl,
  deleteFromStorage,
} = require("../services/storageService");

// =====================================
// HELPER: GENERATE ANNOUNCEMENT IMAGE URL
// =====================================

const mapAnnouncementImage = async (announcement) => {
  if (!announcement.image_url) return announcement;

  try {
    // Object key Neon Storage
    if (announcement.image_url.startsWith("announcements/")) {
      return {
        ...announcement,
        image_url: await getPrivateFileUrl(announcement.image_url),
      };
    }

    // URL eksternal yang sudah lengkap
    if (/^https?:\/\//i.test(announcement.image_url)) {
      return announcement;
    }

    // Path lokal lama tidak bisa dibaca dari Neon
    return {
      ...announcement,
      image_url: null,
    };
  } catch (error) {
    console.error("GENERATE ANNOUNCEMENT URL ERROR:", error);

    return {
      ...announcement,
      image_url: null,
    };
  }
};

// =====================================
// GET ACTIVE ANNOUNCEMENTS
// UNTUK SLIDER APLIKASI KARYAWAN
// =====================================

exports.getActiveAnnouncements = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.title,
        a.description,
        a.image_url,
        a.button_text,
        a.button_link,
        a.sort_order,
        a.start_date,
        a.end_date,
        a.url,
        a.created_at,
        a.created_by,
        u.name AS created_by_name
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.is_active = true
        AND (
          a.start_date IS NULL
          OR a.start_date <= CURRENT_DATE
        )
        AND (
          a.end_date IS NULL
          OR a.end_date >= CURRENT_DATE
        )
      ORDER BY a.sort_order ASC, a.created_at DESC
    `);

    const announcements = await Promise.all(
      result.rows.map(mapAnnouncementImage),
    );

    return res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (err) {
    console.error("GET ACTIVE ANNOUNCEMENTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil pengumuman",
    });
  }
};

// =====================================
// GET ALL ANNOUNCEMENTS
// DASHBOARD HR
// =====================================

exports.getAllAnnouncements = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        description,
        image_url,
        button_text,
        button_link,
        is_active,
        sort_order,
        start_date,
        end_date,
        created_at,
        updated_at,
        url
      FROM announcements
      ORDER BY created_at DESC
    `);

    const announcements = await Promise.all(
      result.rows.map(mapAnnouncementImage),
    );

    return res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (err) {
    console.error("GET ALL ANNOUNCEMENTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data pengumuman",
    });
  }
};

// =====================================
// CREATE ANNOUNCEMENT
// DASHBOARD HR
// =====================================

exports.createAnnouncement = async (req, res) => {
  let uploadedKey = null;

  try {
    const { title, description, url, is_active, start_date, end_date } =
      req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Judul pengumuman wajib diisi",
      });
    }

    const created_by = req.user?.id;

    if (!created_by) {
      return res.status(401).json({
        success: false,
        message: "User login tidak ditemukan",
      });
    }

    let image_url = null;

    // Upload gambar ke Neon Object Storage
    if (req.file) {
      uploadedKey = await uploadToStorage(req.file, "announcements");

      image_url = uploadedKey;
    }

    const result = await pool.query(
      `
        INSERT INTO announcements (
          title,
          description,
          image_url,
          url,
          is_active,
          start_date,
          end_date,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        title,
        description || null,
        image_url,
        url || null,
        is_active === "false" ? false : true,
        start_date || null,
        end_date || null,
        created_by,
      ],
    );

    const announcement = await mapAnnouncementImage(result.rows[0]);

    return res.status(201).json({
      success: true,
      message: "Pengumuman berhasil dibuat",
      data: announcement,
    });
  } catch (err) {
    console.error("CREATE ANNOUNCEMENT ERROR:", err);

    // Hapus file Neon jika penyimpanan database gagal
    if (uploadedKey) {
      try {
        await deleteFromStorage(uploadedKey);
      } catch (deleteError) {
        console.error("DELETE UPLOADED ANNOUNCEMENT ERROR:", deleteError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Gagal membuat pengumuman",
    });
  }
};

// =====================================
// UPDATE ANNOUNCEMENT STATUS
// =====================================

exports.updateAnnouncementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(
      `
        UPDATE announcements
        SET
          is_active = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [is_active, id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Pengumuman tidak ditemukan",
      });
    }

    const announcement = await mapAnnouncementImage(result.rows[0]);

    return res.status(200).json({
      success: true,
      message: "Status pengumuman berhasil diperbarui",
      data: announcement,
    });
  } catch (err) {
    console.error("UPDATE ANNOUNCEMENT STATUS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui status pengumuman",
    });
  }
};
