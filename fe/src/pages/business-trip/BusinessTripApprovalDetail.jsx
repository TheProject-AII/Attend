import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Drawer,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import businessTripService from "../../services/businessTripService";

export default function BusinessTripApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const loadDetail = async () => {
    try {
      setLoading(true);

      const response = await businessTripService.getApprovalDetail(id);

      setDetail(response.data?.data || null);
    } catch (error) {
      console.error("Failed to load Business Trip detail:", error);

      setSnackbar({
        open: true,
        severity: "error",
        message:
          error.response?.data?.message ||
          "Failed to load Business Trip detail.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const showMessage = (severity, message) => {
    setSnackbar({
      open: true,
      severity,
      message,
    });
  };

  const handleSubmit = async () => {
    if (!action || saving) return;

    if (action === "REJECT" && !note.trim()) {
      showMessage("warning", "Alasan penolakan wajib diisi.");
      return;
    }

    try {
      setSaving(true);

      await businessTripService.managerAction(id, {
        action,
        comments: note.trim(),
      });

      showMessage(
        "success",
        action === "APPROVE"
          ? "Business Trip berhasil disetujui dan diteruskan ke HR."
          : "Business Trip berhasil ditolak.",
      );

      setAction(null);

      setTimeout(() => {
        navigate("/employee/approval", {
          replace: true,
        });
      }, 1200);
    } catch (error) {
      console.error("Business Trip action failed:", error);

      showMessage(
        "error",
        error.response?.data?.message ||
          "Gagal memproses approval Business Trip.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "50vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress color="success" />
      </Box>
    );
  }

  if (!detail) {
    return (
      <Box p={2}>
        <Alert severity="error">
          Data Business Trip tidak ditemukan atau bukan wewenang Anda.
        </Alert>

        <Button sx={{ mt: 2 }} onClick={() => navigate("/employee/approval")}>
          Kembali ke Approval
        </Button>
      </Box>
    );
  }

  const InfoItem = ({ label, value }) => (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>

      <Typography fontWeight={600} sx={{ mt: 0.5 }}>
        {value ?? "-"}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ pb: 12 }}>
      {/* STICKY HEADER */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          bgcolor: "#F5F7FA",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ textAlign: "center" }}>
          Business Trip Approval
        </Typography>

        <Typography
          color="text.secondary"
          mt={0.5}
          sx={{ textAlign: "center" }}
        >
          Review employee business trip request
        </Typography>
      </Box>

      {/* DETAIL CONTENT */}
      <Box sx={{ p: 2 }}>
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <InfoItem label="Trip Number" value={detail.trip_number} />

            <Divider sx={{ my: 2 }} />

            <InfoItem label="Employee Name" value={detail.employee_name} />

            <Divider sx={{ my: 2 }} />

            <InfoItem label="Employee NIK" value={detail.employee_nik} />

            <Divider sx={{ my: 2 }} />

            <InfoItem label="Department" value={detail.employee_department} />

            <Divider sx={{ my: 2 }} />

            <InfoItem label="Position" value={detail.employee_position} />

            <Divider sx={{ my: 2 }} />

            <InfoItem label="Job Level" value={detail.employee_job_level} />

            <Divider sx={{ my: 2 }} />

            <InfoItem label="Destination" value={detail.destination} />

            <Divider sx={{ my: 2 }} />

            <InfoItem label="Purpose" value={detail.purpose} />

            <Divider sx={{ my: 2 }} />

            <InfoItem
              label="Departure Date"
              value={formatDate(detail.departure_date)}
            />

            <Divider sx={{ my: 2 }} />

            <InfoItem
              label="Return Date"
              value={formatDate(detail.return_date)}
            />

            <Divider sx={{ my: 2 }} />

            <InfoItem
              label="Duration"
              value={
                detail.duration_days != null
                  ? `${detail.duration_days} days`
                  : "-"
              }
            />

            <Divider sx={{ my: 2 }} />

            <InfoItem label="Hotel Nights" value={detail.hotel_nights ?? "-"} />
          </CardContent>
        </Card>

        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Estimated Budget
            </Typography>

            <InfoItem
              label="Transportation"
              value={formatCurrency(detail.transport_estimate)}
            />

            <Divider sx={{ my: 2 }} />

            <InfoItem
              label="Hotel"
              value={formatCurrency(detail.hotel_estimate)}
            />

            <Divider sx={{ my: 2 }} />

            <InfoItem
              label="Food & Beverage"
              value={formatCurrency(detail.fnb_estimate)}
            />

            <Divider sx={{ my: 2 }} />

            <InfoItem
              label="Total Estimate"
              value={formatCurrency(detail.total_estimate)}
            />
          </CardContent>
        </Card>

        <Stack spacing={2} sx={{ mt: 1.5 }}>
          <Button
            fullWidth
            size="large"
            variant="outlined"
            color="error"
            onClick={() => {
              setAction("REJECT");
              setNote("");
            }}
          >
            Reject
          </Button>

          <Button
            fullWidth
            size="large"
            variant="contained"
            color="success"
            onClick={() => {
              setAction("APPROVE");
              setNote("");
            }}
          >
            Approve
          </Button>
        </Stack>

        <Drawer
          anchor="bottom"
          open={Boolean(action)}
          onClose={() => {
            if (!saving) setAction(null);
          }}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            },
          }}
        >
          <Stack spacing={3} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {action === "APPROVE"
                  ? "Approve Business Trip"
                  : "Reject Business Trip"}
              </Typography>

              <Typography color="text.secondary" mt={1}>
                {action === "APPROVE"
                  ? "Note (Optional)"
                  : "Rejection Reason (Required)"}
              </Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder={
                action === "APPROVE"
                  ? "Add a note..."
                  : "Enter rejection reason..."
              }
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />

            <Stack direction="row" spacing={2}>
              <Button
                fullWidth
                variant="outlined"
                disabled={saving}
                onClick={() => setAction(null)}
              >
                Cancel
              </Button>

              <Button
                fullWidth
                variant="contained"
                color={action === "APPROVE" ? "success" : "error"}
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving
                  ? "Processing..."
                  : action === "APPROVE"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
              </Button>
            </Stack>
          </Stack>
        </Drawer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          onClose={() =>
            setSnackbar((prev) => ({
              ...prev,
              open: false,
            }))
          }
        >
          <Alert
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
