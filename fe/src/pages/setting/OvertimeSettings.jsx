import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import Swal from "sweetalert2";
import api from "../../services/api";

const formatNumber = (value) =>
  value === null || value === undefined || value === ""
    ? ""
    : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
        Number(value),
      );
const parseNumber = (value) =>
  Number(String(value).replace(/\./g, "").replace(",", "."));
const defaultPolicy = {
  effective_date: "",
  office_start_time: "08:00",
  office_end_time: "17:00",
  late_tolerance_minutes: 0,
  late_rounding: "CEIL",
  compensation_rounding: "FLOOR",
  payment_method: "FIFO",
  attendance_type: "OFFICE",
  is_active: true,
};
const dateOnly = (v) => String(v || "").slice(0, 10);
const timeOnly = (v) => String(v || "").slice(0, 5);
const jakartaToday = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const nextJakartaDate = () => {
  const [y, m, d] = jakartaToday().split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
};
const displayDate = (date) => {
  if (!date) return "-";
  const [y, m, d] = dateOnly(date).split("-");
  return `${d}/${m}/${y}`;
};
const errMessage = (err, fallback) => err?.response?.data?.message || fallback;

function Section({ icon, title, open, onToggle, children }) {
  return (
    <Card sx={{ borderRadius: 2, mb: 2, overflow: "hidden" }}>
      <Box
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {icon}
          <Typography fontWeight={600}>{title}</Typography>
        </Stack>
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      {open && (
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            px: { xs: 2, sm: 3 },
            py: 3,
          }}
        >
          {children}
        </Box>
      )}
    </Card>
  );
}

export default function OvertimeSettings() {
  const [openSection, setOpenSection] = useState("overtime");
  const [weekdayRate, setWeekdayRate] = useState("");
  const [weekendRate, setWeekendRate] = useState("");
  const [overtimeLoading, setOvertimeLoading] = useState(true);
  const [overtimeSaving, setOvertimeSaving] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [versions, setVersions] = useState([]);
  const [policy, setPolicy] = useState({
    ...defaultPolicy,
    effective_date: nextJakartaDate(),
  });

  const loadOvertime = useCallback(async () => {
    setOvertimeLoading(true);
    try {
      const { data } = await api.get("/overtime/admin/settings");
      setWeekdayRate(formatNumber(data?.data?.weekday_rate));
      setWeekendRate(formatNumber(data?.data?.weekend_rate));
    } catch (err) {
      console.error("LOAD OVERTIME SETTINGS ERROR:", err);
      Swal.fire(
        "Gagal",
        errMessage(err, "Gagal mengambil tarif lembur."),
        "error",
      );
    } finally {
      setOvertimeLoading(false);
    }
  }, []);

  const loadPolicy = useCallback(async () => {
    setPolicyLoading(true);
    try {
      const { data } = await api.get("/late-compensation/settings");
      const list = Array.isArray(data?.versions) ? data.versions : [];
      setVersions(list);
      const latest = [...list].sort((a, b) =>
        dateOnly(b.effective_date).localeCompare(dateOnly(a.effective_date)),
      )[0];
      const source = latest || data?.data || defaultPolicy;
      setPolicy({
        ...defaultPolicy,
        office_start_time: timeOnly(source.office_start_time) || "08:00",
        office_end_time: timeOnly(source.office_end_time) || "17:00",
        late_tolerance_minutes: Number(source.late_tolerance_minutes ?? 0),
        late_rounding: source.late_rounding || "CEIL",
        compensation_rounding: source.compensation_rounding || "FLOOR",
        payment_method: "FIFO",
        attendance_type: "OFFICE",
        is_active: source.is_active !== false,
        effective_date: nextJakartaDate(),
      });
    } catch (err) {
      console.error("LOAD LATE SETTINGS ERROR:", err);
      Swal.fire(
        "Gagal",
        errMessage(err, "Gagal mengambil pengaturan keterlambatan."),
        "error",
      );
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOvertime();
    loadPolicy();
  }, [loadOvertime, loadPolicy]);

  const sortedVersions = useMemo(
    () =>
      [...versions].sort((a, b) =>
        dateOnly(b.effective_date).localeCompare(dateOnly(a.effective_date)),
      ),
    [versions],
  );
  const today = jakartaToday();
  const activePolicy = sortedVersions.find(
    (item) => dateOnly(item.effective_date) <= today,
  );
  const scheduledVersions = sortedVersions.filter(
    (item) => dateOnly(item.effective_date) > today,
  );
  const latestVersionDate = dateOnly(sortedVersions[0]?.effective_date);
  const minEffectiveDate = nextJakartaDate();
  const updatePolicy = (key, value) =>
    setPolicy((prev) => ({ ...prev, [key]: value }));

  const handleSaveOvertime = async () => {
    const weekday = parseNumber(weekdayRate);
    const weekend = parseNumber(weekendRate);
    if (![weekday, weekend].every((n) => Number.isFinite(n) && n >= 0)) {
      return Swal.fire(
        "Periksa Data",
        "Tarif lembur harus berupa angka minimal 0.",
        "warning",
      );
    }
    setOvertimeSaving(true);
    try {
      const response = await api.patch("/overtime/admin/settings", {
        weekday_rate: weekday,
        weekend_rate: weekend,
      });
      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: response.data?.message || "Tarif lembur tersimpan.",
        timer: 1500,
        showConfirmButton: false,
      });
      await loadOvertime();
    } catch (err) {
      Swal.fire(
        "Gagal",
        errMessage(err, "Gagal menyimpan tarif lembur."),
        "error",
      );
    } finally {
      setOvertimeSaving(false);
    }
  };

  const handleSavePolicy = async () => {
    const tolerance = Number(policy.late_tolerance_minutes);
    if (
      !/^\d{2}:\d{2}$/.test(policy.office_start_time) ||
      !/^\d{2}:\d{2}$/.test(policy.office_end_time) ||
      policy.office_start_time >= policy.office_end_time
    ) {
      return Swal.fire(
        "Periksa Jam",
        "Jam pulang harus setelah jam masuk dan berformat HH:mm.",
        "warning",
      );
    }
    if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 1440) {
      return Swal.fire(
        "Periksa Toleransi",
        "Toleransi harus bilangan bulat 0–1440 menit.",
        "warning",
      );
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(policy.effective_date) ||
      policy.effective_date < minEffectiveDate ||
      (latestVersionDate && policy.effective_date <= latestVersionDate)
    ) {
      return Swal.fire(
        "Periksa Tanggal",
        "Tanggal efektif harus setelah hari ini dan setelah tanggal versi kebijakan terakhir.",
        "warning",
      );
    }
    const confirm = await Swal.fire({
      title: "Jadwalkan kebijakan baru?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, simpan",
      cancelButtonText: "Batal",
      text: `Kebijakan akan mulai berlaku ${displayDate(policy.effective_date)}. Kebijakan sebelumnya tetap disimpan.`,
    });
    if (!confirm.isConfirmed) return;
    setPolicySaving(true);
    try {
      const payload = {
        ...policy,
        late_tolerance_minutes: tolerance,
        office_start_time: `${policy.office_start_time}:00`,
        office_end_time: `${policy.office_end_time}:00`,
        payment_method: "FIFO",
        attendance_type: "OFFICE",
      };
      const response = await api.put("/late-compensation/settings", payload);
      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: response.data?.message || "Kebijakan berhasil dijadwalkan.",
        timer: 1700,
        showConfirmButton: false,
      });
      await loadPolicy();
    } catch (err) {
      Swal.fire(
        "Gagal",
        errMessage(err, "Gagal menyimpan kebijakan."),
        "error",
      );
    } finally {
      setPolicySaving(false);
    }
  };

  const currencyInput = (label, value, setter) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value}
      disabled={overtimeLoading || overtimeSaving}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        setter(digits ? formatNumber(digits) : "");
      }}
      InputProps={{
        startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
        endAdornment: <InputAdornment position="end">/ jam</InputAdornment>,
      }}
    />
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        Pengaturan
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Kelola pengaturan sistem absensi dan lembur.
      </Typography>

      <Section
        icon={<AccessTimeIcon />}
        title="Pengaturan Overtime"
        open={openSection === "overtime"}
        onToggle={() =>
          setOpenSection(openSection === "overtime" ? null : "overtime")
        }
      >
        <Box sx={{ maxWidth: 800 }}>
          <Typography variant="h6" fontWeight={600}>
            Tarif Lembur
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, mb: 2 }}
          >
            Tarif digunakan untuk menghitung nominal lembur berdasarkan durasi
            lembur.
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Stack spacing={2.5}>
            {currencyInput("Senin – Jumat", weekdayRate, setWeekdayRate)}
            {currencyInput("Sabtu – Minggu", weekendRate, setWeekendRate)}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={overtimeLoading || overtimeSaving}
                onClick={handleSaveOvertime}
              >
                {overtimeSaving ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Section>

      <Section
        icon={<WorkHistoryIcon />}
        title="Pengaturan Jam Kerja"
        open={openSection === "working-hours"}
        onToggle={() =>
          setOpenSection(
            openSection === "working-hours" ? null : "working-hours",
          )
        }
      >
        <Typography variant="body2" color="text.secondary">
          Pengaturan jam kerja umum akan ditambahkan di sini. Jam perhitungan
          kompensasi keterlambatan dapat diatur melalui Pengaturan Absensi di
          bawah.
        </Typography>
      </Section>

      <Section
        icon={<EventAvailableIcon />}
        title="Pengaturan Absensi & Late Compensation"
        open={openSection === "attendance"}
        onToggle={() =>
          setOpenSection(openSection === "attendance" ? null : "attendance")
        }
      >
        {policyLoading ? (
          <Stack direction="row" alignItems="center" spacing={2}>
            <CircularProgress size={22} />
            <Typography>Memuat kebijakan...</Typography>
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Alert severity="info">
              Perubahan hanya dapat dijadwalkan untuk tanggal mendatang.
              Perhitungan memakai versi kebijakan sesuai tanggal absensi.
            </Alert>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Kebijakan yang Sedang Berlaku
              </Typography>
              {activePolicy ? (
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                  <Chip
                    label={`Sejak ${displayDate(activePolicy.effective_date)}`}
                  />
                  <Chip
                    label={`Masuk ${timeOnly(activePolicy.office_start_time)}`}
                  />
                  <Chip
                    label={`Pulang ${timeOnly(activePolicy.office_end_time)}`}
                  />
                  <Chip
                    label={`Toleransi ${activePolicy.late_tolerance_minutes} menit`}
                  />
                  <Chip
                    color={activePolicy.is_active ? "success" : "default"}
                    label={activePolicy.is_active ? "Aktif" : "Nonaktif"}
                  />
                </Stack>
              ) : (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Belum ada versi kebijakan yang berlaku pada hari ini. Periksa
                  tanggal versi awal.
                </Alert>
              )}
              {scheduledVersions.length > 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Ada {scheduledVersions.length} kebijakan terjadwal yang belum
                  berlaku.
                </Typography>
              )}
            </Box>
            <Divider />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Jadwalkan Kebijakan Baru
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Form diisi dari versi terbaru sebagai referensi. Mengubah form
                tidak mengubah kebijakan aktif sampai tanggal efektifnya.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Jam Masuk"
                    type="time"
                    value={policy.office_start_time}
                    onChange={(e) =>
                      updatePolicy("office_start_time", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Jam Pulang"
                    type="time"
                    value={policy.office_end_time}
                    onChange={(e) =>
                      updatePolicy("office_end_time", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Toleransi Keterlambatan (menit)"
                    type="number"
                    value={policy.late_tolerance_minutes}
                    inputProps={{ min: 0, max: 1440, step: 1 }}
                    onChange={(e) =>
                      updatePolicy("late_tolerance_minutes", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tanggal Mulai Berlaku"
                    type="date"
                    value={policy.effective_date}
                    onChange={(e) =>
                      updatePolicy("effective_date", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: minEffectiveDate }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label="Pembulatan Keterlambatan"
                    value={policy.late_rounding}
                    onChange={(e) =>
                      updatePolicy("late_rounding", e.target.value)
                    }
                  >
                    <MenuItem value="CEIL">Ke atas (CEIL)</MenuItem>
                    <MenuItem value="FLOOR">Ke bawah (FLOOR)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label="Pembulatan Kompensasi"
                    value={policy.compensation_rounding}
                    onChange={(e) =>
                      updatePolicy("compensation_rounding", e.target.value)
                    }
                  >
                    <MenuItem value="FLOOR">Ke bawah (FLOOR)</MenuItem>
                    <MenuItem value="CEIL">Ke atas (CEIL)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Metode Pembayaran"
                    value="FIFO — Utang tertua dahulu"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Jenis Absensi"
                    value="OFFICE"
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={policy.is_active}
                        onChange={(e) =>
                          updatePolicy("is_active", e.target.checked)
                        }
                      />
                    }
                    label={
                      policy.is_active
                        ? "Perhitungan kompensasi aktif"
                        : "Perhitungan kompensasi nonaktif"
                    }
                  />
                </Grid>
              </Grid>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={policySaving}
                  onClick={handleSavePolicy}
                >
                  {policySaving ? "Menyimpan..." : "Jadwalkan Kebijakan"}
                </Button>
              </Box>
            </Box>
            <Divider />
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
                Riwayat Versi Kebijakan
              </Typography>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tanggal Berlaku</TableCell>
                      <TableCell>Jam Kerja</TableCell>
                      <TableCell>Toleransi</TableCell>
                      <TableCell>Pembulatan</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedVersions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          Belum ada riwayat kebijakan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedVersions.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            {displayDate(item.effective_date)}
                          </TableCell>
                          <TableCell>
                            {timeOnly(item.office_start_time)} –{" "}
                            {timeOnly(item.office_end_time)}
                          </TableCell>
                          <TableCell>
                            {item.late_tolerance_minutes} menit
                          </TableCell>
                          <TableCell>
                            Telat: {item.late_rounding} / Kompensasi:{" "}
                            {item.compensation_rounding}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Chip
                                size="small"
                                label={
                                  dateOnly(item.effective_date) > today
                                    ? "Terjadwal"
                                    : "Berlaku sejak"
                                }
                                color={
                                  dateOnly(item.effective_date) > today
                                    ? "info"
                                    : "default"
                                }
                              />
                              <Chip
                                size="small"
                                label={item.is_active ? "Aktif" : "Nonaktif"}
                                color={item.is_active ? "success" : "default"}
                              />
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        )}
      </Section>
    </Box>
  );
}
