import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";

import {
  ArrowBack,
  CheckCircle,
  Cancel,
  FlightTakeoff,
  LocationOn,
  CalendarMonth,
  Person,
} from "@mui/icons-material";

import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  );
};

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function DetailItem({ label, value }) {
  return (
    <Box>
      <Typography color="text.secondary" fontSize={12}>
        {label}
      </Typography>
      <Typography fontWeight={600} mt={0.4}>
        {value || "-"}
      </Typography>
    </Box>
  );
}

export default function BusinessTripHRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/business-trips/approvals/hr");
        const rows = response.data?.data || [];

        const selectedTrip = rows.find(
          (item) => String(item.id) === String(id),
        );

        if (!selectedTrip) {
          setTrip(null);
          setError("Data Business Trip tidak ditemukan dalam antrean HR.");
          return;
        }

        setTrip(selectedTrip);
      } catch (err) {
        console.error("HR BUSINESS TRIP DETAIL ERROR:", err);
        setError(
          err.response?.data?.message ||
            "Gagal mengambil detail Business Trip.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleAction = async (action) => {
    if (!trip || submitting) return;

    if (action === "REJECT" && !comments.trim()) {
      setError("Komentar wajib diisi untuk menolak pengajuan.");
      return;
    }

    const confirmMessage =
      action === "APPROVE"
        ? "Apakah Anda yakin ingin menyetujui perjalanan dinas ini?"
        : "Apakah Anda yakin ingin menolak perjalanan dinas ini?";

    if (!window.confirm(confirmMessage)) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await api.post(`/business-trips/approvals/${id}/hr-action`, {
        action,
        comments: comments.trim(),
      });

      setSuccess(
        action === "APPROVE"
          ? "Business Trip berhasil disetujui HR."
          : "Business Trip berhasil ditolak.",
      );

      setTimeout(() => {
        navigate("/business-trips");
      }, 1000);
    } catch (err) {
      console.error("HR BUSINESS TRIP ACTION ERROR:", err);
      setError(
        err.response?.data?.message ||
          "Gagal memproses approval Business Trip.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        minHeight="50vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!trip) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/business-trips")}
          sx={{ mb: 2 }}
        >
          Kembali
        </Button>

        <Alert severity="error">
          {error || "Data Business Trip tidak ditemukan."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={2.5}
      >
        <Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate("/business-trips")}
            sx={{ mb: 1 }}
          >
            Kembali ke Business Trip
          </Button>

          <Typography variant="h5" fontWeight={700}>
            Detail Business Trip
          </Typography>

          <Typography color="text.secondary" fontSize={13}>
            Pemeriksaan pengajuan perjalanan dinas oleh HR.
          </Typography>
        </Box>

        <Chip label="Menunggu Approval HR" color="warning" variant="outlined" />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <FlightTakeoff color="primary" />
            <Typography fontWeight={700} variant="h6">
              Informasi Perjalanan
            </Typography>
          </Stack>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={4}>
              <DetailItem label="Nomor Perjalanan" value={trip.trip_number} />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DetailItem label="Nama Karyawan" value={trip.employee_name} />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DetailItem label="Departemen" value={trip.employee_department} />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DetailItem label="Jabatan" value={trip.employee_position} />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DetailItem label="Job Level" value={trip.employee_job_level} />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DetailItem label="Tujuan" value={trip.destination} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <CalendarMonth color="primary" />
            <Typography fontWeight={700}>Jadwal Perjalanan</Typography>
          </Stack>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={4}>
              <DetailItem
                label="Tanggal Keberangkatan"
                value={formatDate(trip.departure_date)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <DetailItem
                label="Tanggal Kepulangan"
                value={formatDate(trip.return_date)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <DetailItem
                label="Durasi"
                value={trip.duration_days ? `${trip.duration_days} hari` : "-"}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <DetailItem
                label="Jumlah Malam Hotel"
                value={
                  trip.hotel_nights != null ? `${trip.hotel_nights} malam` : "-"
                }
              />
            </Grid>

            <Grid item xs={12}>
              <DetailItem label="Keperluan Perjalanan" value={trip.purpose} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Typography fontWeight={700} mb={2}>
            Estimasi Biaya
          </Typography>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={3}>
              <DetailItem
                label="Transportasi"
                value={formatRupiah(trip.transport_estimate)}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DetailItem
                label="Hotel"
                value={formatRupiah(trip.hotel_estimate)}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DetailItem
                label="Makan dan Minum"
                value={formatRupiah(trip.fnb_estimate)}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DetailItem
                label="Total Estimasi"
                value={formatRupiah(trip.total_estimate)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card
        elevation={0}
        sx={{
          mt: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography fontWeight={700} mb={1.5}>
            Keputusan HR
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Komentar HR"
            placeholder="Masukkan catatan atau alasan penolakan..."
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            disabled={submitting}
          />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="flex-end"
            spacing={1.5}
            mt={2}
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              onClick={() => handleAction("REJECT")}
              disabled={submitting}
            >
              Reject
            </Button>

            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => handleAction("APPROVE")}
              disabled={submitting}
            >
              {submitting ? "Memproses..." : "Approve"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
