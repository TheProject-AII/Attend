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
        "Failed",
        errMessage(err, "Failed to load overtime rates."),
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
        "Failed",
        errMessage(err, "Failed to load late-arrival settings."),
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
        "Check the Data",
        "Overtime rates must be numbers greater than or equal to 0.",
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
        title: "Success",
        text: response.data?.message || "Overtime rates saved.",
        timer: 1500,
        showConfirmButton: false,
      });
      await loadOvertime();
    } catch (err) {
      Swal.fire(
        "Failed",
        errMessage(err, "Failed to save overtime rates."),
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
        endAdornment: <InputAdornment position="end">/ hour</InputAdornment>,
      }}
    />
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage attendance and overtime system settings.
      </Typography>

      <Section
        icon={<AccessTimeIcon />}
        title="Overtime Settings"
        open={openSection === "overtime"}
        onToggle={() =>
          setOpenSection(openSection === "overtime" ? null : "overtime")
        }
      >
        <Box sx={{ maxWidth: 800 }}>
          <Typography variant="h6" fontWeight={600}>
            Overtime Rates
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, mb: 2 }}
          >
            Rates are used to calculate overtime pay based on the duration of
            overtime.
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Stack spacing={2.5}>
            {currencyInput("Monday – Friday", weekdayRate, setWeekdayRate)}
            {currencyInput("Saturday – Sunday", weekendRate, setWeekendRate)}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={overtimeLoading || overtimeSaving}
                onClick={handleSaveOvertime}
              >
                {overtimeSaving ? "Saving..." : "Save Settings"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Section>

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
        <Typography variant="body2" color="text.secondary">
          General working-hour settings will be added here. Late compensation
          hours can be configured in Attendance Settings below.
        </Typography>
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
    </Box>
  );
}
