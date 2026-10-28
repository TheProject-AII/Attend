import React, { useCallback, useEffect, useState } from "react";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import Swal from "sweetalert2";
import api from "../../services/api";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
const rawApiUrl = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;

function getToken() {
  return (
    localStorage.getItem("token") || localStorage.getItem("accessToken") || ""
  );
}

async function apiGet(path, signal) {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${response.status})`);
  }

  return json;
}

function formatMinutes(value) {
  const total = Math.max(0, Number(value) || 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function SummaryCard({ label, value, icon, color }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 1,
        height: "100%",
      }}
    >
      <Stack spacing={1}>
        <Box sx={{ color }}>{icon}</Box>

        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>

        <Typography variant="h5" fontWeight={800}>
          {value}
        </Typography>
      </Stack>
    </Paper>
  );
}

function DetailDialog({ employeeId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !employeeId) return;

    const controller = new AbortController();

    async function loadDetail() {
      setLoading(true);
      setError("");
      setData(null);

      try {
        const result = await apiGet(
          `/late-compensation/employees/${employeeId}`,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDetail();

    return () => controller.abort();
  }, [employeeId, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
        }}
      >
        <Typography component="span" fontWeight={800}>
          Compensation Details
        </Typography>

        <IconButton
          onClick={onClose}
          aria-label="Close dialog"
          size="small"
          sx={{ ml: "auto" }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box textAlign="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data ? (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {data.employee?.name || "-"}
              </Typography>

              <Typography color="text.secondary" variant="body2">
                {data.employee?.email || "-"}
              </Typography>

              <Typography color="text.secondary" variant="caption">
                {data.employee?.department || "-"}
                {" · "}
                {data.employee?.position || "-"}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(3, 1fr)",
                },
                gap: 1.5,
              }}
            >
              <SummaryCard
                label="Total Late Time"
                value={formatMinutes(data.summary?.total_late_minutes)}
                icon={<AccessTimeRoundedIcon />}
                color="#EA580C"
              />

              <SummaryCard
                label="Time Compensated"
                value={formatMinutes(data.summary?.total_paid_minutes)}
                icon={<CheckCircleRoundedIcon />}
                color="#16A34A"
              />

              <SummaryCard
                label="Outstanding Time"
                value={formatMinutes(data.summary?.outstanding_minutes)}
                icon={<WarningAmberRoundedIcon />}
                color="#D97706"
              />
            </Box>

            <Divider />

            <Typography fontWeight={800}>Compensation History</Typography>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Check In</TableCell>
                    <TableCell>Check Out</TableCell>
                    <TableCell align="right">Late</TableCell>
                    <TableCell align="right">Compensated</TableCell>
                    <TableCell align="right">Opening Balance</TableCell>
                    <TableCell align="right">Closing Balance</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {(data.history || []).map((row) => (
                    <TableRow key={row.attendance_id}>
                      <TableCell>{formatDate(row.attendance_date)}</TableCell>

                      <TableCell>{formatTime(row.check_in)}</TableCell>

                      <TableCell>{formatTime(row.check_out)}</TableCell>

                      <TableCell align="right">
                        {formatMinutes(row.late_minutes)}
                      </TableCell>

                      <TableCell align="right">
                        {formatMinutes(row.paid_today)}
                      </TableCell>

                      <TableCell align="right">
                        {formatMinutes(row.opening_balance)}
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          fontWeight={700}
                          color={
                            Number(row.closing_balance) > 0
                              ? "warning.main"
                              : "success.main"
                          }
                        >
                          {formatMinutes(row.closing_balance)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!data.history?.length && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No history yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function AttendanceLateCompensation() {
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setExporting(true);

      const response = await api.get("/late-compensation/export/excel", {
        params: {
          status: filter,
          search: search.trim(),
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const date = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Jakarta",
      });

      link.href = url;
      link.download = `Late_Compensation_${filter}_${date}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("EXPORT EXCEL ERROR:", error);

      Swal.fire({
        icon: "error",
        title: "Export Failed",
        text: "Failed to download late compensation data.",
      });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page + 1),
          limit: String(rowsPerPage),
          search,
          status: filter,
        });

        const [summaryResult, employeeResult] = await Promise.all([
          apiGet("/late-compensation/global-summary", signal),
          apiGet(`/late-compensation/employees?${params}`, signal),
        ]);

        if (signal.aborted) return;

        setSummary(summaryResult.data || {});
        setEmployees(
          Array.isArray(employeeResult.data) ? employeeResult.data : [],
        );
        setTotal(Number(employeeResult.pagination?.total) || 0);
      } catch (err) {
        if (!signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [page, rowsPerPage, search, filter],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadData(controller.signal);

    return () => controller.abort();
  }, [loadData, refreshKey]);

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <SummaryCard
            label="Employees with Late Arrivals"
            value={summary?.total_employees_with_late || 0}
            icon={<GroupsRoundedIcon />}
            color="#2563EB"
          />

          <SummaryCard
            label="Total Late Time"
            value={formatMinutes(summary?.total_late_minutes)}
            icon={<AccessTimeRoundedIcon />}
            color="#EA580C"
          />

          <SummaryCard
            label="Time Compensated"
            value={formatMinutes(summary?.total_paid_minutes)}
            icon={<CheckCircleRoundedIcon />}
            color="#16A34A"
          />

          <SummaryCard
            label="Outstanding Time"
            value={formatMinutes(summary?.outstanding_minutes)}
            icon={<WarningAmberRoundedIcon />}
            color="#D97706"
          />
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 1,
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{
                xs: "column",
                md: "row",
              }}
              justifyContent="space-between"
              alignItems={{
                xs: "stretch",
                md: "center",
              }}
              spacing={2}
            >
              <Typography variant="h6" fontWeight={800}>
                Employee Compensation
              </Typography>

              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => setRefreshKey((prev) => prev + 1)}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportExcel}
                disabled={exporting}
              >
                {exporting ? "Exporting..." : "Export Excel"}
              </Button>
            </Stack>

            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={1.5}
            >
              <TextField
                size="small"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <Select
                size="small"
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="DEBT">Outstanding</MenuItem>
                <MenuItem value="PAID">Paid in Full</MenuItem>
              </Select>
            </Stack>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell align="right">Late</TableCell>
                    <TableCell align="right">Compensated</TableCell>
                    <TableCell align="right">Outstanding</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Detail</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                        No employee data available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((employee) => {
                      const outstanding = Number(
                        employee.outstanding_minutes || 0,
                      );

                      return (
                        <TableRow key={employee.id} hover>
                          <TableCell>
                            <Typography fontWeight={700}>
                              {employee.name}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {employee.email}
                            </Typography>
                          </TableCell>

                          <TableCell>{employee.department || "-"}</TableCell>

                          <TableCell align="right">
                            {formatMinutes(employee.total_late_minutes)}
                          </TableCell>

                          <TableCell align="right">
                            {formatMinutes(employee.total_paid_minutes)}
                          </TableCell>

                          <TableCell align="right">
                            <Typography fontWeight={700}>
                              {formatMinutes(outstanding)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={outstanding > 0 ? "Ada Utang" : "Lunas"}
                              color={outstanding > 0 ? "warning" : "success"}
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell align="center">
                            <IconButton
                              color="primary"
                              onClick={() => setSelectedId(employee.id)}
                            >
                              <VisibilityRoundedIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="Baris per halaman"
            />
          </Stack>
        </Paper>
      </Stack>

      <DetailDialog
        employeeId={selectedId}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </Box>
  );
}
