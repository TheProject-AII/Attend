import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Select,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import api from "../../services/api";

const STATUS_OPTIONS = ["PENDING", "PROCESSING", "REJECTED"];

const STATUS_LABELS = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const getStatusColor = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "COMPLETED":
      return "success";
    case "PROCESSING":
      return "info";
    case "REJECTED":
      return "error";
    case "PENDING":
      return "warning";
    default:
      return "default";
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
};

const getRows = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const getEmployeeName = (item) =>
  item.employee_name ||
  item.user_name ||
  item.name ||
  item.full_name ||
  item.employee?.name ||
  "-";

const getPeriodLabel = (item) => {
  if (item.period_name || item.payroll_period_name || item.period) {
    return item.period_name || item.payroll_period_name || item.period;
  }
  if (item.start_date && item.end_date) {
    return `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`;
  }
  return item.payroll_period_id ? `Periode #${item.payroll_period_id}` : "-";
};

export default function PaySlipRequests() {
  const [requests, setRequests] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = statusFilter === "ALL" ? {} : { status: statusFilter };
      const response = await api.get("/payroll/pay-slip/requests", { params });
      const data = getRows(response);
      setRequests(data);

      const nextDrafts = {};
      data.forEach((item) => {
        nextDrafts[item.id] = {
          status: item.status || "PENDING",
          admin_note: item.admin_note || "",
        };
      });
      setDrafts(nextDrafts);
    } catch (err) {
      console.error("GET PAY SLIP REQUESTS ERROR:", err);
      setRequests([]);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err.message ||
          "Gagal memuat daftar pengajuan Pay Slip."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, rowsPerPage]);

  const filteredRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return requests;

    return requests.filter((item) => {
      const name = getEmployeeName(item).toLowerCase();
      const email = String(item.email || "").toLowerCase();
      const employeeNo = String(
        item.employee_number || item.employee_no || item.nik || ""
      ).toLowerCase();
      const period = getPeriodLabel(item).toLowerCase();
      return (
        name.includes(keyword) ||
        email.includes(keyword) ||
        employeeNo.includes(keyword) ||
        period.includes(keyword)
      );
    });
  }, [requests, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedRequests = filteredRequests.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  const updateDraft = (id, field, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  };

  const saveRequest = async (id) => {
    const draft = drafts[id];
    if (!draft) return;

    if (draft.status === "REJECTED" && !draft.admin_note.trim()) {
      setError("Catatan HR wajib diisi jika pengajuan ditolak.");
      setSuccess("");
      return;
    }

    try {
      setSavingId(id);
      setError("");
      setSuccess("");
      await api.patch(`/payroll/pay-slip/requests/${id}`, {
        status: draft.status,
        admin_note: draft.admin_note,
      });
      setSuccess("Pengajuan Pay Slip berhasil diperbarui.");
      await loadRequests();
    } catch (err) {
      console.error("UPDATE PAY SLIP REQUEST ERROR:", err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err.message ||
          "Gagal memperbarui pengajuan Pay Slip."
      );
    } finally {
      setSavingId(null);
    }
  };

  const sendPaySlip = async (id) => {
    try {
      setSendingId(id);
      setError("");
      setSuccess("");
      await api.post(`/payroll/pay-slip/requests/${id}/send`);
      setSuccess("Slip gaji berhasil dibuat dan dikirim. PDF dilindungi password NIK KTP karyawan.");
      await loadRequests();
    } catch (err) {
      console.error("SEND PAY SLIP ERROR:", err);
      setError(err?.response?.data?.message || err?.response?.data?.error || err.message || "Gagal membuat/mengirim Pay Slip.");
    } finally {
      setSendingId(null);
    }
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
  };

  return (
    <Box>
      <Card
        elevation={0}
        sx={{
          mt: 3,
          border: "1px solid #E5E7EB",
          borderRadius: 1,
        }}
      >
        <CardContent>
          {error && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 1,
                bgcolor: "error.50",
                color: "error.main",
                fontSize: 14,
              }}
            >
              {error}
            </Box>
          )}

          {success && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 1,
                bgcolor: "success.50",
                color: "success.dark",
                fontSize: 14,
              }}
            >
              {success}
            </Box>
          )}

          {/* FILTERS - mengikuti pola Leave History */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ mb: 2 }}
            flexWrap="wrap"
          >
            <TextField
              size="small"
              placeholder="Search employee name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: { xs: "100%", md: 260 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              onClick={handleReset}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              Reset
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadRequests}
              disabled={loading}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              Refresh
            </Button>
          </Stack>

          {/* SUMMARY */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Chip
              icon={<CalendarMonthIcon />}
              label={`Total Requests: ${filteredRequests.length}`}
              variant="outlined"
            />
          </Stack>

          {/* TABLE */}
          <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
            <Table size="medium" sx={{ minWidth: 1050 }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" width={60}>No.</TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Payroll Period</TableCell>
                  <TableCell>Submitted At</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ minWidth: 165 }}>Update Status</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>HR Note</TableCell>
                  <TableCell align="center" sx={{ minWidth: 190 }}>Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 9 }).map((__, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton variant="text" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : paginatedRequests.length > 0
                    ? paginatedRequests.map((item, index) => {
                        const draft = drafts[item.id] || {
                          status: item.status || "PENDING",
                          admin_note: item.admin_note || "",
                        };
                        const employeeName = getEmployeeName(item);

                        return (
                          <TableRow key={item.id} hover>
                            <TableCell align="center">
                              {startIndex + index + 1}
                            </TableCell>

                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={1.2}
                                alignItems="center"
                              >
                                <Avatar
                                  src={
                                    item.employee_photo ||
                                    item.photo_url ||
                                    undefined
                                  }
                                  alt={employeeName}
                                  sx={{ width: 42, height: 42, fontSize: 16 }}
                                >
                                  {employeeName.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                  <Typography fontWeight={600} fontSize={14}>
                                    {employeeName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {item.email ||
                                      item.employee_number ||
                                      item.nik ||
                                      "-"}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>

                            <TableCell>{getPeriodLabel(item)}</TableCell>
                            <TableCell>{formatDate(item.created_at)}</TableCell>
                            <TableCell sx={{ maxWidth: 220, whiteSpace: "normal" }}>
                              {item.reason || "-"}
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                color={getStatusColor(item.status)}
                                label={
                                  STATUS_LABELS[item.status] || item.status || "-"
                                }
                              />
                            </TableCell>

                            <TableCell>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={draft.status}
                                  onChange={(event) =>
                                    updateDraft(
                                      item.id,
                                      "status",
                                      event.target.value
                                    )
                                  }
                                >
                                  {STATUS_OPTIONS.map((status) => (
                                    <MenuItem key={status} value={status}>
                                      {STATUS_LABELS[status]}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>

                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                multiline
                                minRows={1}
                                maxRows={3}
                                placeholder="Catatan HR..."
                                value={draft.admin_note}
                                onChange={(event) =>
                                  updateDraft(
                                    item.id,
                                    "admin_note",
                                    event.target.value
                                  )
                                }
                              />
                            </TableCell>

                            <TableCell align="center">
                              <Stack spacing={0.75} alignItems="center">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<SaveIcon />}
                                  onClick={() => saveRequest(item.id)}
                                  disabled={savingId === item.id || item.status === "COMPLETED"}
                                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                                >
                                  {savingId === item.id ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<SendIcon />}
                                  onClick={() => sendPaySlip(item.id)}
                                  disabled={sendingId === item.id || item.status === "COMPLETED"}
                                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                                >
                                  {sendingId === item.id ? "Mengirim..." : item.has_file ? "Kirim Ulang" : "Kirim Slip"}
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    : (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                          <Typography color="text.secondary">
                            No Pay Slip requests found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* PAGINATION */}
          {!loading && filteredRequests.length > 0 && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
              sx={{ mt: 2 }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Rows per page:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 75 }}>
                  <Select
                    value={rowsPerPage}
                    onChange={(event) =>
                      setRowsPerPage(Number(event.target.value))
                    }
                  >
                    {[10, 25, 50, 100].map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                  {startIndex + 1}–
                  {Math.min(startIndex + rowsPerPage, filteredRequests.length)}{" "}
                  of {filteredRequests.length}
                </Typography>
              </Stack>

              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
              />
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
