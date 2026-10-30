import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";

import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { IconButton } from "@mui/material";

import attendanceService from "../../services/attService";

export default function History() {
  const [editDialog, setEditDialog] = useState(null);

  const [editForm, setEditForm] = useState({
    check_in: "",
    check_out: "",
    reason: "",
  });

  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const nextMonth = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);

      const result = await attendanceService.getHistory();

      setHistory(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return "-";

    return new Date(time).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatInputTime = (time) => {
    if (!time) return "";

    const date = new Date(time);

    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
  };

  const openEditDialog = (item) => {
    setEditDialog(item);

    setEditForm({
      check_in: formatInputTime(item.check_in),
      check_out: formatInputTime(item.check_out),
      reason: "",
    });
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const date = new Date(item.attendance_date);

      return (
        date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
      );
    });
  }, [history, selectedMonth, selectedYear]);

  const summary = useMemo(() => {
    return {
      hadir: filteredHistory.length,

      terlambat: filteredHistory.filter(
        (x) => x.attendance_status === "Terlambat",
      ).length,

      tepatWaktu: filteredHistory.filter(
        (x) => x.attendance_status === "Tepat Waktu",
      ).length,
    };
  }, [filteredHistory]);

  const isValidTime = (value) => {
    if (!/^\d{2}:\d{2}$/.test(value)) {
      return false;
    }

    const [hour, minute] = value.split(":").map(Number);

    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  };

  const buildDateTime = (date, time) => {
    if (!time) return null;

    const dateOnly = new Date(date).toLocaleDateString("en-CA");

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

      const newCheckIn = buildDateTime(
        editDialog.attendance_date,
        editForm.check_in,
      );

      const newCheckOut = buildDateTime(
        editDialog.attendance_date,
        editForm.check_out,
      );

      await attendanceService.createEditRequest({
        attendance_id: editDialog.id,
        new_check_in: newCheckIn,
        new_check_out: newCheckOut,
        reason: editForm.reason,
      });

      setEditDialog(null);

      setEditForm({
        check_in: "",
        check_out: "",
        reason: "",
      });

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

  return (
    <Box
      sx={{
        bgcolor: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
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
            background: "linear-gradient(135deg,#0e7d63,#17a673)",
            color: "#fff",
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
                bgcolor: "#fff",
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

      {/* HISTORY LIST */}
      <Stack spacing={1.25} sx={{ px: 1.5, pt: 1.5, pb: 10 }}>
        {loading ? (
          [...Array(4)].map((_, index) => (
            <Card key={index} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Skeleton width="60%" height={25} />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 1,
                    mt: 1,
                    textAlign: "center",
                  }}
                >
                  {[1, 2, 3].map((i) => (
                    <Box key={i}>
                      <Skeleton width={50} height={25} sx={{ mx: "auto" }} />
                      <Skeleton width={60} height={16} sx={{ mx: "auto" }} />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          ))
        ) : filteredHistory.length === 0 ? (
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography align="center" color="text.secondary" fontSize={13}>
                No attendance history yet.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          filteredHistory.map((item) => (
            <Card
              key={item.id}
              elevation={1}
              sx={{
                borderRadius: 2,
              }}
            >
              <CardContent
                sx={{
                  p: 1.5,
                  "&:last-child": { pb: 1.5 },
                }}
              >
                {/* DATE AND STATUS */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      flex: 1,
                      fontWeight: 700,
                      fontSize: 13,
                      color: "primary.main",
                      lineHeight: 1.3,
                    }}
                  >
                    {new Date(item.attendance_date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </Typography>

                  {item.attendance_status === "Terlambat" ? (
                    <Chip
                      label={`Late by ${item.late_minutes} min`}
                      color="error"
                      size="small"
                      sx={{
                        height: 23,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  ) : (
                    <Chip
                      label="On Time"
                      color="success"
                      size="small"
                      sx={{
                        height: 23,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>

                {/* ATTENDANCE TIME */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 1,
                    textAlign: "center",
                  }}
                >
                  <Box>
                    <Typography fontWeight={700} fontSize={17}>
                      {formatTime(item.check_in)}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontSize={10}
                    >
                      Check In
                    </Typography>
                  </Box>

                  <Box>
                    <Typography fontWeight={700} fontSize={17}>
                      {formatTime(item.check_out)}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontSize={10}
                    >
                      Check Out
                    </Typography>
                  </Box>

                  <Box>
                    <Typography fontWeight={700} fontSize={17}>
                      {item.working_hours || "-"}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontSize={10}
                    >
                      Duration
                    </Typography>
                  </Box>
                </Box>

                {/* EDIT REQUEST */}
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  {item.edit_request_status === "PENDING_SUPERVISOR" ? (
                    <Chip
                      label="Pending Approval"
                      color="warning"
                      size="small"
                      sx={{ height: 23, fontSize: 10 }}
                    />
                  ) : item.edit_request_status === "APPROVED" ? (
                    <Chip
                      label="Corrected"
                      color="success"
                      size="small"
                      sx={{ height: 23, fontSize: 10 }}
                    />
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditRoundedIcon />}
                      onClick={() => openEditDialog(item)}
                      sx={{
                        fontSize: 11,
                        py: 0.4,
                        px: 1,
                        minHeight: 28,
                      }}
                    >
                      Request Change
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      {/* EDIT DIALOG */}
      <Dialog
        open={Boolean(editDialog)}
        onClose={() => {
          if (!submittingEdit) {
            setEditDialog(null);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle fontWeight={700}>Request Attendance Change</DialogTitle>

        <DialogContent>
          {editDialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography fontWeight={600}>
                {new Date(editDialog.attendance_date).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
              </Typography>

              <TextField
                fullWidth
                label="Check-in Time"
                placeholder="HH:mm"
                value={editForm.check_in}
                onChange={(e) => {
                  const value = e.target.value;

                  if (/^\d{0,2}:?\d{0,2}$/.test(value)) {
                    setEditForm((prev) => ({
                      ...prev,
                      check_in: value,
                    }));
                  }
                }}
                helperText="24-hour format, for example: 13:57"
              />

              <TextField
                fullWidth
                label="Check-out Time"
                placeholder="HH:mm"
                value={editForm.check_out}
                onChange={(e) => {
                  const value = e.target.value;

                  if (/^\d{0,2}:?\d{0,2}$/.test(value)) {
                    setEditForm((prev) => ({
                      ...prev,
                      check_out: value,
                    }));
                  }
                }}
                helperText="24-hour format, for example: 17:00"
              />

              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Reason for Change"
                placeholder="Explain why the attendance times need to be changed..."
                value={editForm.reason}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
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
            {submittingEdit ? "Submitting..." : "Submit Change Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
