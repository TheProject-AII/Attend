import React, { useEffect, useState } from "react";
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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "/api";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export default function Payroll() {
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [periodMonth, setPeriodMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const token = localStorage.getItem("token");

  const authConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const loadPeriods = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API}/payroll/periods`, authConfig);

      setPeriods(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Gagal mengambil periode payroll.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const createPeriod = async () => {
    try {
      setSaving("create");
      setDialogError("");
      setError("");
      setMessage("");

      await axios.post(
        `${API}/payroll/periods`,
        { month: periodMonth },
        authConfig,
      );

      setMessage("Periode payroll berhasil dibuat.");
      setOpenDialog(false);
      setDialogError("");

      await loadPeriods();
    } catch (err) {
      setDialogError(
        err.response?.data?.message || "Gagal membuat periode payroll.",
      );
    } finally {
      setSaving(null);
    }
  };

  const generatePayroll = async (period) => {
    const confirmed = window.confirm(
      `Generate payroll untuk ${period.period_name}?\n\nData payroll akan dibuat sebagai snapshot dan tidak bisa di-generate ulang.`,
    );

    if (!confirmed) return;

    try {
      setSaving(period.id);
      setError("");
      setMessage("");

      const response = await axios.post(
        `${API}/payroll/periods/${period.id}/generate`,
        {},
        authConfig,
      );

      setMessage(
        response.data.message ||
          `Payroll berhasil dibuat untuk ${response.data.data?.total_employees || 0} karyawan.`,
      );

      await loadPeriods();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal generate payroll.");
    } finally {
      setSaving(null);
    }
  };

  const openDetails = (period) => {
    navigate(`/payroll/details?periodId=${period.id}`);
  };

  const isGenerated = (period) =>
    period.is_generated === true || period.is_generated === "true";

  const canGenerate = (period) =>
    period.status === "DRAFT" && !isGenerated(period);

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Payroll Period
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage payroll periods and employee salary processing.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ textTransform: "none" }}
        >
          Create Period
        </Button>
      </Stack>

      <Card elevation={0} sx={{ border: "1px solid #E5E7EB" }}>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>No.</TableCell>
                    <TableCell>Payroll Period</TableCell>
                    <TableCell>Cut-off Start</TableCell>
                    <TableCell>Cut-off End</TableCell>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Processing</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {periods.map((period, index) => (
                    <TableRow key={period.id} hover>
                      <TableCell>{index + 1}</TableCell>

                      <TableCell>
                        <Typography fontWeight={600}>
                          {period.period_name}
                        </Typography>
                      </TableCell>

                      <TableCell>{formatDate(period.start_date)}</TableCell>

                      <TableCell>{formatDate(period.end_date)}</TableCell>

                      <TableCell>{formatDate(period.payment_date)}</TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={period.status}
                          color={
                            period.status === "DRAFT"
                              ? "warning"
                              : period.status === "PAID" ||
                                  period.status === "CLOSED"
                                ? "success"
                                : "info"
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            isGenerated(period) ? "Generated" : "Not Generated"
                          }
                          color={isGenerated(period) ? "success" : "default"}
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="center"
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => openDetails(period)}
                            sx={{ textTransform: "none" }}
                          >
                            Details
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={
                              !canGenerate(period) || saving === period.id
                            }
                            onClick={() => generatePayroll(period)}
                            sx={{ textTransform: "none" }}
                          >
                            {saving === period.id
                              ? "Generating..."
                              : "Generate"}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}

                  {periods.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary" py={4}>
                          No payroll period found. Create a new period to get
                          started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create Payroll Period</DialogTitle>

        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}

          <TextField
            fullWidth
            type="month"
            label="Payroll Month"
            value={periodMonth}
            onChange={(e) => {
              setPeriodMonth(e.target.value);
              setDialogError("");
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Payroll starts on the 21st of the previous month and ends on the
            20th of the selected month. Payment is scheduled for the last day of
            the selected month.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>

          <Button
            variant="contained"
            onClick={createPeriod}
            disabled={saving === "create" || !periodMonth}
          >
            {saving === "create" ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
