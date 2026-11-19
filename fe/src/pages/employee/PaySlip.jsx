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
  TextField,
  Typography,
} from "@mui/material";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import paySlipService from "../../services/paySlipService";

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

  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, ""));
    }

    const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (filenameMatch?.[1]) {
      return filenameMatch[1].trim();
    }
  }

  return item.file_name || `Slip-Gaji-${item.period_name || item.id}.pdf`;
};

export default function PaySlip() {
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
  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 2500);

    return () => clearTimeout(timer);
  }, [success]);
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [periodRes, requestRes] = await Promise.all([
        paySlipService.getAvailablePeriods(),
        paySlipService.getMyRequests(),
      ]);

      setPeriods(periodRes.data?.data || []);
      setRequests(requestRes.data?.data || []);
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

      setSuccess(`Download ${filename} berhasil dimulai.`);
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
        <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

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
            <Stack spacing={1.5}>
              {requests.map((item) => {
                const meta = statusMeta[item.status] || {
                  label: item.status,
                  color: "default",
                };

                return (
                  <Box
                    key={item.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography fontWeight={700}>
                        {item.period_name || "Payroll Period"}
                      </Typography>

                      <Chip
                        size="small"
                        color={meta.color}
                        label={meta.label}
                      />
                    </Stack>

                    {item.reason && (
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Alasan: {item.reason}
                      </Typography>
                    )}

                    {item.admin_note && (
                      <Alert
                        severity={item.status === "REJECTED" ? "error" : "info"}
                        sx={{ mt: 1 }}
                      >
                        {item.admin_note}
                      </Alert>
                    )}

                    {item.status === "COMPLETED" && (
                      <Button
                        sx={{ mt: 1 }}
                        variant="outlined"
                        size="small"
                        startIcon={
                          downloading === item.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <DownloadRoundedIcon />
                          )
                        }
                        disabled={downloading === item.id}
                        onClick={() => downloadSlip(item)}
                      >
                        {downloading === item.id
                          ? "Mengunduh..."
                          : "Download Slip Gaji"}
                      </Button>
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
