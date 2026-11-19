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
  CalendarMonth,
  PictureAsPdf,
  Visibility,
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

export default function BusinessTripDirectorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [letterIssued, setLetterIssued] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    const fetchDetail = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/business-trips/approvals/director");
        const rows = response.data?.data || [];

        const selectedTrip = rows.find(
          (item) => String(item.id) === String(id),
        );

        if (!active) return;

        if (!selectedTrip) {
          setTrip(null);
          setError(
            "Data Business Trip tidak ditemukan dalam antrean Direktur.",
          );
          return;
        }

        setTrip(selectedTrip);
      } catch (err) {
        if (!active) return;

        console.error("DIRECTOR BUSINESS TRIP DETAIL ERROR:", err);
        setError(
          err.response?.data?.message ||
            "Gagal mengambil detail Business Trip.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      active = false;
    };
  }, [id]);

  const handlePreviewSPD = async () => {
    if (previewLoading) return;

    // Buka tab secara langsung agar tidak diblokir browser.
    const previewWindow = window.open("about:blank", "_blank");

    if (!previewWindow) {
      setError(
        "Browser memblokir tab baru. Izinkan pop-up untuk membuka PDF SPD.",
      );
      return;
    }

    previewWindow.document.write(
      "<p style='font-family:Arial;padding:24px'>Sedang memuat PDF SPD...</p>",
    );

    setPreviewLoading(true);
    setError("");

    try {
      const response = await api.get(`/business-trips/${id}/letter/pdf`, {
        responseType: "blob",
      });

      const contentType =
        response.headers?.["content-type"] || "application/pdf";

      if (!contentType.includes("application/pdf")) {
        const message = await response.data.text();
        throw new Error(message || "Server tidak mengembalikan PDF.");
      }

      const pdfBlob = new Blob([response.data], {
        type: "application/pdf",
      });

      const pdfUrl = URL.createObjectURL(pdfBlob);

      previewWindow.location.href = pdfUrl;

      // URL tetap tersedia selama tab preview digunakan.
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 10 * 60 * 1000);
    } catch (err) {
      console.error("PREVIEW SPD ERROR:", err);

      previewWindow.close();

      let message =
        err.response?.data?.message || err.message || "Gagal membuka PDF SPD.";

      if (err.response?.data instanceof Blob) {
        try {
          const data = JSON.parse(await err.response.data.text());
          message = data.message || message;
        } catch {
          // Gunakan pesan error awal.
        }
      }

      setError(message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!trip || submitting || letterIssued) return;

    if (action === "REJECT" && !comments.trim()) {
      setError("Komentar wajib diisi untuk menolak pengajuan.");
      return;
    }

    const confirmMessage =
      action === "APPROVE"
        ? "Setujui perjalanan dinas ini dan terbitkan SPD otomatis?"
        : "Tolak pengajuan perjalanan dinas ini?";

    if (!window.confirm(confirmMessage)) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/business-trips/approvals/${id}/director-action`,
        {
          action,
          comments: comments.trim(),
        },
      );

      const result = response.data;

      if (action === "APPROVE") {
        setLetterIssued(Boolean(result.letter));
        setSuccess(
          `${result.message || "Business Trip berhasil disetujui."}${
            result.letter?.letter_number
              ? ` Nomor SPD: ${result.letter.letter_number}`
              : ""
          }`,
        );
      } else {
        setSuccess(result.message || "Business Trip berhasil ditolak.");

        setTimeout(() => {
          navigate("/business-trip/director");
        }, 1500);
      }
    } catch (err) {
      console.error("DIRECTOR BUSINESS TRIP ACTION ERROR:", err);
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
          onClick={() => navigate("/business-trip/director")}
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
            onClick={() => navigate("/business-trip/director")}
            sx={{ mb: 1 }}
          >
            Kembali ke Approval Direktur
          </Button>

          <Typography variant="h5" fontWeight={700}>
            Detail Business Trip
          </Typography>

          <Typography color="text.secondary" fontSize={13}>
            Pemeriksaan dan persetujuan perjalanan dinas oleh Direktur.
          </Typography>
        </Box>

        <Chip
          label={
            letterIssued
              ? "SPD Telah Diterbitkan"
              : "Menunggu Approval Direktur"
          }
          color={letterIssued ? "success" : "warning"}
          variant="outlined"
        />
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

      {letterIssued && (
        <Card
          elevation={0}
          sx={{
            mb: 2,
            border: "1px solid",
            borderColor: "success.light",
            borderRadius: 2,
          }}
        >
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography fontWeight={700}>
                  Surat Perjalanan Dinas berhasil diterbitkan
                </Typography>
                <Typography color="text.secondary" fontSize={13}>
                  Preview surat SPD untuk pengajuan ini.
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={
                  previewLoading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <PictureAsPdf />
                  )
                }
                onClick={handlePreviewSPD}
                disabled={previewLoading}
              >
                {previewLoading ? "Memuat PDF..." : "Preview PDF SPD"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
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

      {!letterIssued && (
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
              Keputusan Direktur
            </Typography>

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Catatan Direktur"
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
                {submitting ? "Memproses..." : "Approve & Terbitkan SPD"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {letterIssued && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Pengajuan sudah diteruskan ke Finance. Direktur dapat melihat PDF SPD
          melalui tombol Preview PDF SPD di atas.
        </Alert>
      )}
    </Box>
  );
}
