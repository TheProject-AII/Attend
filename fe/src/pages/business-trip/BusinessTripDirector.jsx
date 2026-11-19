import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Refresh, Visibility, FlightTakeoff } from "@mui/icons-material";

import businessTripService from "../../services/businessTripService";

export default function BusinessTripDirector() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await businessTripService.getDirectorApprovals();
      const result = response.data?.data;

      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("DIRECTOR BUSINESS TRIP ERROR:", err);
      setError(
        err.response?.data?.message ||
          "Gagal mengambil daftar pengajuan Business Trip.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "-";

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Business Trip Approval
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Daftar pengajuan perjalanan dinas yang menunggu persetujuan
            Direktur.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: "#E0F2F1",
                color: "#0F766E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FlightTakeoff />
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Menunggu Persetujuan Direktur
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {loading ? "—" : data.length}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2 }}>
          <Typography fontWeight={700}>Daftar Pengajuan</Typography>
          <Typography variant="body2" color="text.secondary">
            Periksa informasi perjalanan sebelum memberikan persetujuan.
          </Typography>
        </Box>

        <Divider />

        {loading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress />
            <Typography color="text.secondary" mt={2}>
              Memuat pengajuan...
            </Typography>
          </Box>
        ) : data.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <FlightTakeoff
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography fontWeight={600}>Belum ada pengajuan</Typography>
            <Typography variant="body2" color="text.secondary">
              Pengajuan yang sudah disetujui HR akan muncul di sini.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                  <TableCell>No. Pengajuan</TableCell>
                  <TableCell>Karyawan</TableCell>
                  <TableCell>Tujuan</TableCell>
                  <TableCell>Periode</TableCell>
                  <TableCell align="right">Estimasi Biaya</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Aksi</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.map((item) => (
                  <TableRow hover key={item.id}>
                    <TableCell>
                      <Typography fontWeight={700} fontSize={13}>
                        {item.trip_number || `BT-${item.id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(item.submitted_at)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography fontWeight={600} fontSize={13}>
                        {item.employee_name || "-"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.employee_nik || "-"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography fontSize={13}>
                        {item.destination || "-"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography fontSize={13}>
                        {formatDate(item.departure_date)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        s.d. {formatDate(item.return_date)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography fontWeight={600} fontSize={13}>
                        {formatCurrency(item.total_estimate)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label="Menunggu Direktur"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Visibility />}
                        onClick={() =>
                          navigate(`/business-trip/director/${item.id}`)
                        }
                        sx={{
                          bgcolor: "#0F766E",
                          "&:hover": { bgcolor: "#115E59" },
                          textTransform: "none",
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
