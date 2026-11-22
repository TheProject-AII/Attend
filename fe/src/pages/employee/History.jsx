import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import attendanceService from "../../services/attService";
import AttendanceLocationMap from "../../components/attendance/AttendanceLocationMap";

const configuredApi = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/+$/,
  "",
);
const API_ROOT = configuredApi.endsWith("/api")
  ? configuredApi
  : `${configuredApi}/api`;

const EMPTY_EDIT_FORM = { check_in: "", check_out: "", reason: "" };

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatDate(value, options = {}) {
  if (!value) return "-";
  // Treat date-only values as local calendar dates, avoiding UTC day shifts.
  const dateOnly = String(value).slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    weekday: options.weekday || "short",
    day: "numeric",
    month: options.month || "short",
    year: "numeric",
  });
}

function formatInputTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function PhotoPanel({ label, url, available, loading, error, color }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="subtitle2"
        sx={{ fontSize: 12 }}
        mb={1}
        color={color}
      >
        {label}
      </Typography>
      <Box
        sx={{
          height: 130,
          borderRadius: 2,
          border: "1px solid #E5E7EB",
          bgcolor: "#F3F4F6",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {loading && available ? (
          <CircularProgress size={26} />
        ) : url ? (
          <Box
            component="img"
            src={url}
            alt={`${label} photo`}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", fontSize: 11 }}
            px={2}
          >
            {available && error
              ? "Failed to load photo"
              : `${label} photo is unavailable`}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function History() {
  const [editDialog, setEditDialog] = useState(null);
  const [detailDialog, setDetailDialog] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [photos, setPhotos] = useState({ checkIn: "", checkOut: "" });
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();
  const now = new Date();

  const isCurrentMonth =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const prevMonth = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(1);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const nextMonth = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(1);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const result = await attendanceService.getHistory();
      setHistory(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      console.error("Failed to load attendance history:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const dateText = String(item.attendance_date || "").slice(0, 10);
      const [year, month] = dateText.split("-").map(Number);
      return month - 1 === selectedMonth && year === selectedYear;
    });
  }, [history, selectedMonth, selectedYear]);

  const summary = useMemo(
    () => ({
      hadir: filteredHistory.length,
      terlambat: filteredHistory.filter(
        (item) => item.attendance_status === "Terlambat",
      ).length,
      tepatWaktu: filteredHistory.filter(
        (item) => item.attendance_status === "Tepat Waktu",
      ).length,
    }),
    [filteredHistory],
  );

  const openEditDialog = (item) => {
    setEditDialog(item);
    setEditForm({
      check_in: formatInputTime(item.check_in),
      check_out: formatInputTime(item.check_out),
      reason: "",
    });
  };

  const openDetailDialog = (item) => {
    setPhotos({ checkIn: "", checkOut: "" });
    setPhotoError("");
    setDetailDialog(item);
  };

  const closeDetailDialog = () => {
    setDetailDialog(null);
    setPhotos({ checkIn: "", checkOut: "" });
    setPhotoError("");
  };

  useEffect(() => {
    if (!detailDialog) return undefined;

    const controller = new AbortController();
    let active = true;

    const loadPhotos = async () => {
      setPhotos({ checkIn: "", checkOut: "" });
      setPhotoError("");

      const attendance = detailDialog;
      if (!attendance.photo_path && !attendance.check_out_photo_path) return;

      const attendanceId = attendance.attendance_id || attendance.id;
      if (!attendanceId) {
        setPhotoError("Attendance ID is unavailable.");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setPhotoError("Login session not found. Please sign in again.");
        return;
      }

      setPhotoLoading(true);

      const fetchPhoto = async (type) => {
        const response = await fetch(
          `${API_ROOT}/attendance/${encodeURIComponent(attendanceId)}/photo/${type}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );

        const result = await response.json();
        if (!response.ok || !result.success || !result.data?.url) {
          throw new Error(result.message || `Failed to retrieve ${type} photo`);
        }
        return result.data.url;
      };

      try {
        const [checkIn, checkOut] = await Promise.allSettled([
          attendance.photo_path ? fetchPhoto("check-in") : Promise.resolve(""),
          attendance.check_out_photo_path
            ? fetchPhoto("check-out")
            : Promise.resolve(""),
        ]);

        if (!active) return;

        setPhotos({
          checkIn: checkIn.status === "fulfilled" ? checkIn.value : "",
          checkOut: checkOut.status === "fulfilled" ? checkOut.value : "",
        });

        const errors = [checkIn, checkOut]
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason?.message || "Failed to load photo");

        if (errors.length) setPhotoError(errors.join("; "));
      } catch (err) {
        if (active && err.name !== "AbortError") {
          setPhotoError(err.message || "Failed to load attendance photos.");
        }
      } finally {
        if (active) setPhotoLoading(false);
      }
    };

    loadPhotos();

    return () => {
      active = false;
      controller.abort();
    };
  }, [detailDialog]);

  const isValidTime = (value) => {
    if (!/^\d{2}:\d{2}$/.test(value)) return false;
    const [hour, minute] = value.split(":").map(Number);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  };

  const buildDateTime = (date, time) => {
    if (!time) return null;
    const dateOnly = String(date).slice(0, 10);
    return `${dateOnly} ${time}:00`;
  };

  const submitEditRequest = async () => {
    if (!editDialog) return;

    if (!editForm.reason.trim()) {
      alert("A reason for the change is required.");
      return;
    }
    if (editForm.check_in && !isValidTime(editForm.check_in)) {
      alert("Check-in time must use HH:mm format, for example 13:57.");
      return;
    }
    if (editForm.check_out && !isValidTime(editForm.check_out)) {
      alert("Check-out time must use HH:mm format, for example 17:00.");
      return;
    }

    try {
      setSubmittingEdit(true);
      await attendanceService.createEditRequest({
        attendance_id: editDialog.id,
        new_check_in: buildDateTime(
          editDialog.attendance_date,
          editForm.check_in,
        ),
        new_check_out: buildDateTime(
          editDialog.attendance_date,
          editForm.check_out,
        ),
        reason: editForm.reason,
      });

      setEditDialog(null);
      setEditForm(EMPTY_EDIT_FORM);
      await loadHistory();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message ||
          "Failed to submit the attendance change request.",
      );
    } finally {
      setSubmittingEdit(false);
    }
  };

  const detailStatus = detailDialog?.status || "-";
  const detailStatusLabel =
    {
      Hadir: "Present",
      Terlambat: "Late",
      Pulang: "Checked Out",
      "Belum Check In": "Not Checked In",
      "Belum Pulang": "Not Checked Out",
    }[detailStatus] || detailStatus;

  return (
    <Box sx={{ bgcolor: "#F5F7FB", minHeight: "100vh" }}>
      {/* HEADER AND MONTH FILTER */}
      <Box
        sx={{
          position: "sticky",
          top: "48px",
          zIndex: 10,
          bgcolor: "#F5F7FA",
          px: 2,
          pt: 1.5,
          pb: 1.5,
          borderBottom: "1px solid #ECEFF1",
          boxShadow: "0 2px 10px rgba(0,0,0,.05)",
        }}
      >
        <Card
          sx={{
            mb: 1.5,
            borderRadius: 2,
            background: "#0D439A",
            color: "#FFF",
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Typography variant="h6" fontWeight={700}>
              Attendance History
            </Typography>

            <Box
              sx={{
                mt: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "#FFF",
                borderRadius: 2,
                px: 0.5,
                py: 0.25,
                color: "#000",
              }}
            >
              <IconButton size="small" onClick={prevMonth}>
                <ChevronLeftRoundedIcon />
              </IconButton>
              <Typography fontWeight={700} fontSize={15}>
                {monthNames[selectedMonth]} {selectedYear}
              </Typography>
              <IconButton
                size="small"
                onClick={nextMonth}
                disabled={isCurrentMonth}
              >
                <ChevronRightRoundedIcon />
              </IconButton>
            </Box>

            <Typography
              variant="caption"
              sx={{
                mt: 1,
                display: "block",
                textAlign: "center",
                color: "rgba(255,255,255,.9)",
              }}
            >
              {summary.hadir} days present | {summary.terlambat} late |{" "}
              {summary.tepatWaktu} on time
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ATTENDANCE CARD LIST */}
      <Stack spacing={1.5} sx={{ px: 2, pt: 2, pb: 10 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              height={55}
              sx={{ borderRadius: 3 }}
            />
          ))
        ) : filteredHistory.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
            No attendance history yet.
          </Typography>
        ) : (
          filteredHistory.map((item) => {
            const isLate = item.attendance_status === "Terlambat";

            return (
              <Box
                key={item.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1.15fr 1fr 1fr 32px",
                    sm: "1.3fr 1fr 1fr 36px",
                  },
                  alignItems: "center",
                  gap: 0.5,
                  minHeight: 54,
                  px: 1.2,
                  py: 0.7,
                  borderRadius: 1,
                  bgcolor: isLate ? "#FF3035" : "#00C66A",
                  color: "#FFFFFF",
                }}
              >
                {/* TANGGAL */}
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: 13, sm: 16 },
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(item.attendance_date, {
                    weekday: undefined,
                    month: "numeric",
                  }).replace(/^[A-Za-z]+,?\s*/, "")}
                </Typography>

                {/* CHECK IN */}
                <Box sx={{ textAlign: "center", minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: 12, sm: 15 },
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                    }}
                  >
                    check in
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.35,
                      fontWeight: 800,
                      fontSize: { xs: 14, sm: 17 },
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatTime(item.check_in)}
                  </Typography>
                </Box>

                {/* CHECK OUT */}
                <Box sx={{ textAlign: "center", minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: 12, sm: 15 },
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                    }}
                  >
                    check out
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.35,
                      fontWeight: 800,
                      fontSize: { xs: 14, sm: 17 },
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatTime(item.check_out)}
                  </Typography>
                </Box>

                {/* DETAIL */}
                <IconButton
                  size="small"
                  aria-label="View attendance details"
                  onClick={() => openDetailDialog(item)}
                  sx={{
                    color: "#FFFFFF",
                    width: 32,
                    height: 32,
                    justifySelf: "end",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,.16)",
                    },
                  }}
                >
                  <VisibilityRoundedIcon sx={{ fontSize: 27 }} />
                </IconButton>
              </Box>
            );
          })
        )}
      </Stack>

      {/* ATTENDANCE DETAIL */}
      <Dialog
        open={Boolean(detailDialog)}
        onClose={closeDetailDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent dividers>
          {detailDialog && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  Attendance Detail
                </Typography>
                <Divider />
                <Typography
                  sx={{ fontSize: 12, fontWeight: 750, color: "black" }}
                >
                  {formatDate(detailDialog.attendance_date, {
                    weekday: "long",
                    month: "long",
                  })}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2,minmax(0,1fr))",
                      sm: "repeat(3,minmax(0,1fr))",
                    },
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{ fontSize: 12 }}
                      variant="caption"
                      color="text.secondary"
                    >
                      Check In
                    </Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 750 }}>
                      {formatTime(detailDialog.check_in)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      sx={{ fontSize: 12 }}
                      variant="caption"
                      color="text.secondary"
                    >
                      Check Out
                    </Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 750 }}>
                      {formatTime(detailDialog.check_out)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      sx={{ fontSize: 12 }}
                      variant="caption"
                      color="text.secondary"
                    >
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.4 }}>
                      <Chip
                        label={detailStatusLabel}
                        size="small"
                        color={
                          detailStatus === "Terlambat"
                            ? "error"
                            : detailStatus === "Pulang" ||
                                detailStatus === "Hadir"
                              ? "success"
                              : "default"
                        }
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography
                      sx={{ fontSize: 12 }}
                      variant="caption"
                      color="text.secondary"
                    >
                      Duration
                    </Typography>
                    <Typography fontWeight={600}>
                      {detailDialog.working_hours || "-"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Divider />

              {/* REQUEST CHANGE */}
              <Box sx={{ textAlign: "center" }}>
                {detailDialog.edit_request_status === "PENDING_SUPERVISOR" ? (
                  <Chip
                    sx={{ borderRadius: 1 }}
                    label="Correction Pending Approval"
                    color="warning"
                    size="small"
                  />
                ) : detailDialog.edit_request_status === "APPROVED" ? (
                  <Chip label="Corrected" color="success" size="small" />
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    startIcon={<EditRoundedIcon />}
                    onClick={() => {
                      const selected = detailDialog;
                      closeDetailDialog();
                      openEditDialog(selected);
                    }}
                  >
                    Attendance Correction
                  </Button>
                )}
              </Box>
              <Divider />

              {/* ATTENDANCE PHOTOS */}
              <Box>
                {photoError && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {photoError}
                  </Alert>
                )}

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 1.5,
                  }}
                >
                  <PhotoPanel
                    label="Check In"
                    color="success.main"
                    url={photos.checkIn}
                    available={Boolean(detailDialog.photo_path)}
                    loading={photoLoading}
                    error={photoError}
                  />

                  <PhotoPanel
                    label="Check Out"
                    color="error.main"
                    url={photos.checkOut}
                    available={Boolean(detailDialog.check_out_photo_path)}
                    loading={photoLoading}
                    error={photoError}
                  />
                </Box>
              </Box>

              <Divider />

              {/* ATTENDANCE LOCATION */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  Attendance Location
                </Typography>

                <AttendanceLocationMap
                  checkInLat={detailDialog.check_in_lat}
                  checkInLng={detailDialog.check_in_lng}
                  checkOutLat={detailDialog.check_out_lat}
                  checkOutLng={detailDialog.check_out_lng}
                  showAutoCheckout={false}
                  height={130}
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetailDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* REQUEST CHANGE */}
      <Dialog
        open={Boolean(editDialog)}
        onClose={() => {
          if (!submittingEdit) setEditDialog(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle fontWeight={700}></DialogTitle>
        <DialogContent>
          {editDialog && (
            <Stack>
              <Typography sx={{ fontWeight: 750, color: "black" }}>
                Correction For:
              </Typography>
              <Typography sx={{ fontWeight: 750, color: "red", mb: 2 }}>
                {formatDate(editDialog.attendance_date, {
                  weekday: "long",
                  month: "long",
                })}
              </Typography>
              <TextField
                fullWidth
                type="time"
                label="Check-in Time"
                value={editForm.check_in}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    check_in: event.target.value,
                  }))
                }
                onKeyDown={(event) => event.preventDefault()}
                onPaste={(event) => event.preventDefault()}
                inputProps={{ step: 60 }}
                InputLabelProps={{ shrink: true }}
                helperText="Select the check-in time using the clock picker."
              />
              <TextField
                fullWidth
                type="time"
                label="Check-out Time"
                value={editForm.check_out}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    check_out: event.target.value,
                  }))
                }
                onKeyDown={(event) => event.preventDefault()}
                onPaste={(event) => event.preventDefault()}
                inputProps={{ step: 60 }}
                InputLabelProps={{ shrink: true }}
                helperText="Select the check-out time using the clock picker."
              />
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Reason for Change"
                placeholder="Explain why the attendance times need to be changed..."
                value={editForm.reason}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(null)} disabled={submittingEdit}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={submitEditRequest}
            disabled={submittingEdit || !editForm.reason.trim()}
          >
            {submittingEdit ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
