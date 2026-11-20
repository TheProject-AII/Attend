import { useCallback, useEffect, useState } from "react";

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
  FormControl,
  MenuItem,
  Select,
  Stack,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";

import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import paySlipService from "../../services/paySlipService";
import authService from "../../services/authService";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";

const statusMeta = {
  PENDING: { label: "Pending", color: "warning" },

  PROCESSING: { label: "Processing", color: "info" },

  COMPLETED: { label: "Completed", color: "success" },

  REJECTED: { label: "Rejected", color: "error" },
};

const getDownloadFilename = (response, item) => {
  const disposition =
    response.headers?.["content-disposition"] ||
    response.headers?.["Content-Disposition"];

  // Ambil NIP dari data request jika tersedia
  const nip = item.nip || item.employee_nip || "NIP";

  const period = (item.period_name || "Periode")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*]/g, "");

  return `${nip}-${period}.pdf`;
};

const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return "-";

  const value = String(accountNumber);

  if (value.length <= 6) {
    return "X".repeat(value.length);
  }

  return value.slice(0, 8) + "X".repeat(value.length - 8);
};

export default function PaySlip() {
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [downloading, setDownloading] = useState(null);

  const [open, setOpen] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState("");

  const [reason, setReason] = useState("");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");
  const [bankData, setBankData] = useState(null);
  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 6000);

    return () => clearTimeout(timer);
  }, [success]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const [periodRes, requestRes, meRes] = await Promise.all([
        paySlipService.getAvailablePeriods(),
        paySlipService.getMyRequests(),
        authService.getMe(token),
      ]);

      setPeriods(periodRes.data?.data || []);
      setRequests(requestRes.data?.data || []);

      // Data rekening user yang sedang login
      setBankData(meRes?.user || null);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat data slip gaji.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitRequest = async () => {
    if (!selectedPeriod) return;

    setSubmitting(true);

    setError("");

    try {
      await paySlipService.createRequest({
        payroll_period_id: Number(selectedPeriod),

        reason: reason.trim() || null,
      });

      setOpen(false);

      setSelectedPeriod("");

      setReason("");

      setSuccess("Permintaan slip gaji berhasil diajukan.");

      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengajukan slip gaji.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSlip = async (item) => {
    setDownloading(item.id);

    setError("");

    setSuccess("");

    let objectUrl = null;

    try {
      const response = await paySlipService.downloadSlip(item.id);

      console.log("DOWNLOAD RESPONSE:", {
        status: response.status,

        data: response.data,

        isBlob: response.data instanceof Blob,

        size: response.data?.size,

        type: response.data?.type,
      });

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: "application/pdf" });

      if (!blob.size) {
        throw new Error("File PDF kosong.");
      }

      // Pastikan response benar-benar PDF.

      if (
        blob.type &&
        !blob.type.toLowerCase().includes("pdf") &&
        blob.type !== "application/octet-stream"
      ) {
        throw new Error("Server tidak mengirim file PDF yang valid.");
      }

      const filename = getDownloadFilename(response, item);

      objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = objectUrl;

      link.download = filename;

      link.style.display = "none";

      document.body.appendChild(link);

      link.click();

      console.log("Download anchor clicked");

      console.log("Blob URL:", objectUrl);

      console.log("Download filename:", filename);

      console.log("Anchor connected:", link.isConnected);

      // Jangan hapus URL terlalu cepat.

      setTimeout(() => {
        link.remove();

        if (objectUrl) {
          window.URL.revokeObjectURL(objectUrl);
        }
      }, 1500);

      setSuccess(
        `Slip is currently being downloaded.\nPassword PDF: tanggal lahir format YYYYMMDD.`,
      );
    } catch (err) {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }

      console.error("Download Pay Slip Error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Gagal mengunduh slip gaji.",
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: "auto" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess("")}
          sx={{ mb: 2, whiteSpace: "pre-line" }}
        >
          {success}
        </Alert>
      )}
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1.5,
          py: 1.5,
          mb: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          aria-label="Kembali"
          size="small"
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            bgcolor: "action.hover",
            color: "text.primary",
            "&:hover": {
              bgcolor: "action.selected",
            },
          }}
        >
          <ArrowBackRoundedIcon />
        </IconButton>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            fontSize={16}
            fontWeight={700}
            color="text.primary"
            lineHeight={1.4}
          >
            Pay Slip
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              lineHeight: 1.4,
            }}
          >
            Payroll Bank & Request Pay Slip
          </Typography>
        </Box>
      </Box>
      <Card
        sx={{
          borderRadius: 1,
          mb: 1.5,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <Typography sx={{ fontWeight: 750 }}>Account Bank</Typography>
          </Stack>

          {loading ? (
            <CircularProgress size={18} />
          ) : (
            <>
              <Typography fontWeight={700} fontSize={14}>
                {bankData?.name || "-"}
              </Typography>

              <Typography
                variant="body2"
                sx={{ fontWeight: 650, color: "#0f50ab" }}
              >
                {bankData?.bank_name || "Bank belum diatur"} -{" "}
                {maskAccountNumber(bankData?.bank_account_number)}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
      <Card sx={{ borderRadius: 1, mb: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography fontWeight={700}>Request Pay Slip</Typography>

              <Typography variant="body2" color="text.secondary">
                Pilih periode payroll yang sudah disetujui.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<DescriptionRoundedIcon />}
              onClick={() => {
                setError("");

                setOpen(true);
              }}
              disabled={!periods.length}
            >
              Ajukan Permintaan
            </Button>
          </Stack>

          {!loading && !periods.length && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Tidak ada periode gaji yang tersedia untuk diajukan.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Button
        size="small"
        onClick={loadData}
        startIcon={<RefreshRoundedIcon />}
      >
        Refresh
      </Button>

      <Card sx={{ borderRadius: 1 }}>
        <CardContent>
          <Typography fontWeight={700} mb={1}>
            Riwayat Permintaan
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : requests.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              Belum ada permintaan slip gaji.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {requests.map((item) => {
                const isCompleted = item.status === "COMPLETED";
                const isRejected = item.status === "REJECTED";
                const isProcessing = item.status === "PROCESSING";

                return (
                  <Box
                    key={item.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography fontSize={13} fontWeight={700}>
                      Slip - {item.period_name || "Payroll Period"}
                    </Typography>

                    {isCompleted ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={
                          downloading === item.id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <DownloadRoundedIcon />
                          )
                        }
                        disabled={downloading === item.id}
                        onClick={() => downloadSlip(item)}
                        sx={{
                          textTransform: "none",
                          fontSize: 11,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {downloading === item.id ? "Mengunduh..." : "Download"}
                      </Button>
                    ) : (
                      <Chip
                        size="small"
                        color={
                          isRejected
                            ? "error"
                            : isProcessing
                              ? "info"
                              : "warning"
                        }
                        label={
                          isRejected
                            ? "Rejected"
                            : isProcessing
                              ? "Processing"
                              : "Pending"
                        }
                        sx={{ fontSize: 10, height: 23 }}
                      />
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={() => !submitting && setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Ajukan Slip Gaji</DialogTitle>

        <DialogContent>
          <Typography variant="body2" fontWeight={600} mb={1} mt={1}>
            Periode Payroll
          </Typography>

          <FormControl fullWidth>
            <Select
              displayEmpty
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value="" disabled>
                Pilih periode payroll
              </MenuItem>

              {periods.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.period_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="body2" fontWeight={600} mb={1} mt={2}>
            Alasan (Opsional)
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tambahkan keterangan jika diperlukan"
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={submitting}>
            Batal
          </Button>

          <Button
            variant="contained"
            onClick={submitRequest}
            disabled={submitting || !selectedPeriod}
          >
            {submitting ? "Mengirim..." : "Ajukan"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
<Alert severity="info" sx={{ mb: 2 }}>
  <Typography variant="body2" fontWeight={700}>
    Password untuk membuka file PDF adalah tanggal lahir Anda.
  </Typography>
  <Typography variant="body2">
    Masukkan dengan format <strong>YYYYMMDD</strong> (tahun-bulan-tanggal),
    tanpa tanda hubung. Contoh: 7 Mei 1996 = <strong>19960507</strong>.
  </Typography>
</Alert>;
