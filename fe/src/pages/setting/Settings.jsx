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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

export default function Settings() {
  const [openSection, setOpenSection] = useState("overtime");
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [versions, setVersions] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(true);
  const [workingHoursSaving, setWorkingHoursSaving] = useState(false);
  const [editWorkingHours, setEditWorkingHours] = useState(null);
  const [policy, setPolicy] = useState({
    ...defaultPolicy,
    effective_date: nextJakartaDate(),
  });

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
      console.error("LOAD LATE SETTINGS ERROR:", err.response?.data || err);

      Swal.fire(
        "Failed",
        errMessage(err, "Failed to load late-arrival settings."),
        "error",
      );
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  const loadWorkingHours = useCallback(async () => {
    setWorkingHoursLoading(true);

    try {
      const { data } = await api.get("/settings/working-hours");

      setWorkingHours(data?.data || []);
    } catch (err) {
      console.error("LOAD WORKING HOURS ERROR:", err);

      Swal.fire(
        "Failed",
        errMessage(err, "Failed to load working hours."),
        "error",
      );
    } finally {
      setWorkingHoursLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicy();
    loadWorkingHours();
  }, [loadPolicy, loadWorkingHours]);

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

  const handleSavePolicy = async () => {
    const tolerance = Number(policy.late_tolerance_minutes);
    if (
      !/^\d{2}:\d{2}$/.test(policy.office_start_time) ||
      !/^\d{2}:\d{2}$/.test(policy.office_end_time) ||
      policy.office_start_time >= policy.office_end_time
    ) {
      return Swal.fire(
        "Check the Times",
        "End time must be later than start time and use HH:mm format.",
        "warning",
      );
    }
    if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 1440) {
      return Swal.fire(
        "Check the Tolerance",
        "Tolerance must be a whole number from 0 to 1440 minutes.",
        "warning",
      );
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(policy.effective_date) ||
      policy.effective_date < minEffectiveDate ||
      (latestVersionDate && policy.effective_date <= latestVersionDate)
    ) {
      return Swal.fire(
        "Check the Date",
        "The effective date must be after today and after the latest policy version date.",
        "warning",
      );
    }
    const confirm = await Swal.fire({
      title: "Schedule a new policy?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, save",
      cancelButtonText: "Cancel",
      text: `The policy will take effect on ${displayDate(policy.effective_date)}. The previous policy will remain saved.`,
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
        title: "Success",
        text: response.data?.message || "Policy scheduled successfully.",
        timer: 1700,
        showConfirmButton: false,
      });
      await loadPolicy();
    } catch (err) {
      Swal.fire(
        "Failed",
        errMessage(err, "Failed to save the policy."),
        "error",
      );
    } finally {
      setPolicySaving(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    if (!editWorkingHours) return;

    const { id, office_start_time, office_end_time } = editWorkingHours;

    if (!office_start_time || !office_end_time) {
      return Swal.fire(
        "Periksa Data",
        "Jam masuk dan pulang wajib diisi.",
        "warning",
      );
    }

    if (office_start_time >= office_end_time) {
      return Swal.fire(
        "Periksa Jam",
        "Jam pulang harus lebih besar dari jam masuk.",
        "warning",
      );
    }

    setWorkingHoursSaving(true);

    try {
      const response = await api.patch(`/settings/working-hours/${id}`, {
        office_start_time,
        office_end_time,
      });

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: response.data?.message || "Jam kerja berhasil diperbarui.",
        timer: 1500,
        showConfirmButton: false,
      });

      setEditWorkingHours(null);
      await loadWorkingHours();
    } catch (err) {
      Swal.fire(
        "Gagal",
        errMessage(err, "Gagal memperbarui jam kerja."),
        "error",
      );
    } finally {
      setWorkingHoursSaving(false);
    }
  };
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage attendance system settings.
      </Typography>

      <Section
        icon={<WorkHistoryIcon />}
        title="Working Hours Settings"
        open={openSection === "working-hours"}
        onToggle={() =>
          setOpenSection(
            openSection === "working-hours" ? null : "working-hours",
          )
        }
      >
        {workingHoursLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Grid container spacing={2}>
            {["5_DAYS", "6_DAYS"].map((schedule) => {
              const item = workingHours
                .filter((row) => row.work_schedule === schedule)
                .sort((a, b) =>
                  dateOnly(b.effective_date).localeCompare(
                    dateOnly(a.effective_date),
                  ),
                )[0];

              return (
                <Grid item xs={12} md={6} key={schedule}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight={700}>
                      {schedule === "5_DAYS" ? "5 Hari Kerja" : "6 Hari Kerja"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {schedule === "5_DAYS"
                        ? "Senin – Jumat"
                        : "Senin – Sabtu"}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="body2">
                      Jam Masuk: {timeOnly(item?.office_start_time)}
                    </Typography>

                    <Typography variant="body2">
                      Jam Pulang: {timeOnly(item?.office_end_time)}
                    </Typography>

                    <Typography variant="body2">
                      Jam Kerja Mingguan: {item?.weekly_work_hours || 40} jam
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Efektif: {displayDate(item?.effective_date)}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        mt: 2,
                      }}
                    >
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          setEditWorkingHours({
                            id: item.id,
                            office_start_time: timeOnly(item.office_start_time),
                            office_end_time: timeOnly(item.office_end_time),
                          })
                        }
                      >
                        Edit
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Section>

      <Section
        icon={<EventAvailableIcon />}
        title="Attendance & Late Compensation Settings"
        open={openSection === "attendance"}
        onToggle={() =>
          setOpenSection(openSection === "attendance" ? null : "attendance")
        }
      >
        {policyLoading ? (
          <Stack direction="row" alignItems="center" spacing={2}>
            <CircularProgress size={22} />
            <Typography>Loading policy...</Typography>
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Alert severity="info">
              Changes can only be scheduled for a future date. Calculations use
              the policy version applicable to the attendance date.
            </Alert>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Currently Active Policy
              </Typography>
              {activePolicy ? (
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                  <Chip
                    label={`Sejak ${displayDate(activePolicy.effective_date)}`}
                  />
                  <Chip
                    label={`Start ${timeOnly(activePolicy.office_start_time)}`}
                  />
                  <Chip
                    label={`End ${timeOnly(activePolicy.office_end_time)}`}
                  />
                  <Chip
                    label={`Tolerance ${activePolicy.late_tolerance_minutes} min`}
                  />
                  <Chip
                    color={activePolicy.is_active ? "success" : "default"}
                    label={activePolicy.is_active ? "Active" : "Inactive"}
                  />
                </Stack>
              ) : (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  No policy version is active today. Check the initial version
                  date.
                </Alert>
              )}
              {scheduledVersions.length > 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {scheduledVersions.length} scheduled policies are not yet
                  active.
                </Typography>
              )}
            </Box>
            <Divider />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Schedule a New Policy
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The form is prefilled from the latest version for reference.
                Changes will not affect the active policy until the effective
                date.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Start Time"
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
                    label="End Time"
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
                    label="Late Arrival Tolerance (minutes)"
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
                    label="Effective Date"
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
                    label="Late Time Rounding"
                    value={policy.late_rounding}
                    onChange={(e) =>
                      updatePolicy("late_rounding", e.target.value)
                    }
                  >
                    <MenuItem value="CEIL">Round Up (CEIL)</MenuItem>
                    <MenuItem value="FLOOR">Round Down (FLOOR)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label="Compensation Rounding"
                    value={policy.compensation_rounding}
                    onChange={(e) =>
                      updatePolicy("compensation_rounding", e.target.value)
                    }
                  >
                    <MenuItem value="FLOOR">Round Down (FLOOR)</MenuItem>
                    <MenuItem value="CEIL">Round Up (CEIL)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Payment Method"
                    value="FIFO — Oldest debt first"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Attendance Type"
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
                        ? "Compensation calculation active"
                        : "Compensation calculation inactive"
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
                  {policySaving ? "Saving..." : "Schedule Policy"}
                </Button>
              </Box>
            </Box>
            <Divider />
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
                Policy Version History
              </Typography>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Effective Date</TableCell>
                      <TableCell>Working Hours</TableCell>
                      <TableCell>Tolerance</TableCell>
                      <TableCell>Rounding</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedVersions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          No policy history yet.
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
                            {item.late_tolerance_minutes} min
                          </TableCell>
                          <TableCell>
                            Late: {item.late_rounding} / Compensation:{" "}
                            {item.compensation_rounding}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Chip
                                size="small"
                                label={
                                  dateOnly(item.effective_date) > today
                                    ? "Scheduled"
                                    : "Effective since"
                                }
                                color={
                                  dateOnly(item.effective_date) > today
                                    ? "info"
                                    : "default"
                                }
                              />
                              <Chip
                                size="small"
                                label={item.is_active ? "Active" : "Inactive"}
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
      <Dialog
        open={Boolean(editWorkingHours)}
        onClose={() => {
          if (!workingHoursSaving) setEditWorkingHours(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Edit Working Hours</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Jam Masuk"
              type="time"
              size="small"
              value={editWorkingHours?.office_start_time || ""}
              onChange={(e) =>
                setEditWorkingHours((prev) => ({
                  ...prev,
                  office_start_time: e.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Jam Pulang"
              type="time"
              size="small"
              value={editWorkingHours?.office_end_time || ""}
              onChange={(e) =>
                setEditWorkingHours((prev) => ({
                  ...prev,
                  office_end_time: e.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setEditWorkingHours(null)}
            disabled={workingHoursSaving}
          >
            Batal
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveWorkingHours}
            disabled={workingHoursSaving}
          >
            {workingHoursSaving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
