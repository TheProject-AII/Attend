import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Avatar,
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
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";

import attendanceService from "../../services/attService";

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

const formatTime = (value) => {
  if (!value) return "00:00";

  // Handle time-only values such as 08:30:00
  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
    return value.substring(0, 5);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "00:00";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
};

const statusConfig = {
  PENDING_SUPERVISOR: {
    label: "Wait Approval",
    color: "warning",
  },
  APPROVED: {
    label: "Approved",
    color: "success",
  },
  REJECTED: {
    label: "Reject",
    color: "error",
  },
};

const getSortValue = (item, field) => {
  const value = item[field];

  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (field === "start_date") {
    return new Date(value).getTime() || 0;
  }

  if (
    field === "old_check_in" ||
    field === "new_check_in" ||
    field === "old_check_out" ||
    field === "new_check_out"
  ) {
    const time = String(value).match(/^(\d{2}):(\d{2})/);

    if (time) {
      return Number(time[1]) * 60 + Number(time[2]);
    }

    return new Date(value).getTime() || 0;
  }

  return String(value).toLowerCase();
};

export default function CorrectionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [dialogType, setDialogType] = useState("");
  const [note, setNote] = useState("");

  // FILTER
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // SORT
  const [orderBy, setOrderBy] = useState("start_date");
  const [order, setOrder] = useState("desc");

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await attendanceService.getCorrectionRequests({
        status: "ALL",
      });

      setRequests(response.data?.data || []);
    } catch (err) {
      console.error("LOAD CORRECTION REQUESTS:", err);

      setError(
        err.response?.data?.message ||
          "Gagal mengambil pengajuan koreksi absensi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openAction = (request, type) => {
    setSelected(request);
    setDialogType(type);
    setNote("");
  };

  const closeDialog = () => {
    if (processing) return;

    setSelected(null);
    setDialogType("");
    setNote("");
  };

  const submitAction = async () => {
    if (!selected || processing) return;

    try {
      setProcessing(true);
      setError("");

      if (dialogType === "approve") {
        await attendanceService.approveAttendanceEdit(selected.id, note);
      } else {
        await attendanceService.rejectAttendanceEdit(selected.id, note);
      }

      setSelected(null);
      setDialogType("");
      setNote("");

      await loadRequests();
    } catch (err) {
      console.error("CORRECTION ACTION:", err);

      setError(err.response?.data?.message || "Gagal memproses pengajuan.");
    } finally {
      setProcessing(false);
    }
  };

  // FILTER DATA
  const filteredRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return requests.filter((item) => {
      const matchSearch =
        !keyword ||
        [item.employee_name, item.department, item.reason].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
        );

      const matchStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [requests, search, statusFilter]);

  // SORT DATA
  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      const valueA = getSortValue(a, orderBy);
      const valueB = getSortValue(b, orderBy);

      let result = 0;

      if (typeof valueA === "number" && typeof valueB === "number") {
        result = valueA - valueB;
      } else {
        result = String(valueA).localeCompare(String(valueB), "id", {
          numeric: true,
        });
      }

      return order === "asc" ? result : -result;
    });
  }, [filteredRequests, orderBy, order]);

  const handleSort = (field) => {
    if (orderBy === field) {
      setOrder((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(field);
      setOrder("asc");
    }
  };

  const sortableHeader = (label, field, align = "left") => (
    <TableCell
      align={align}
      sx={{
        fontWeight: 700,
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        bgcolor: "#F8FAFC",
        color: "#374151",
        lineHeight: 1.25,
      }}
    >
      <TableSortLabel
        active={orderBy === field}
        direction={orderBy === field ? order : "asc"}
        onClick={() => handleSort(field)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const tableHeaderStyle = {
    fontWeight: 700,
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    lineHeight: 1.25,
    bgcolor: "#F8FAFC",
    color: "#374151",
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* FILTER */}
      <Card
        elevation={0}
        sx={{
          mb: 2,
          border: "1px solid #E5E7EB",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "flex-end" }}
          >
            {/* SEARCH */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                fontSize={12}
                fontWeight={700}
                color="text.secondary"
                mb={0.75}
              >
                SEARCH EMPLOYEE
              </Typography>

              <TextField
                fullWidth
                size="small"
                placeholder="Name, department, or reason..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: "#fff",
                  },
                }}
              />
            </Box>

            {/* STATUS */}
            <Box sx={{ width: { xs: "100%", md: 210 }, flexShrink: 0 }}>
              <Typography
                fontSize={12}
                fontWeight={700}
                color="text.secondary"
                mb={0.75}
              >
                STATUS
              </Typography>

              <FormControl fullWidth size="small">
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  sx={{
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: "#fff",
                  }}
                >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="PENDING_SUPERVISOR">
                    Menunggu Approval
                  </MenuItem>
                  <MenuItem value="APPROVED">Disetujui</MenuItem>
                  <MenuItem value="REJECTED">Ditolak</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* SORT */}
            <Box sx={{ width: { xs: "100%", md: 190 }, flexShrink: 0 }}>
              <Typography
                fontSize={12}
                fontWeight={700}
                color="text.secondary"
                mb={0.75}
              >
                SORT BY
              </Typography>

              <FormControl fullWidth size="small">
                <Select
                  value={`${orderBy}|${order}`}
                  onChange={(event) => {
                    const [field, direction] = event.target.value.split("|");

                    setOrderBy(field);
                    setOrder(direction);
                  }}
                  sx={{
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: "#fff",
                  }}
                >
                  <MenuItem value="start_date|desc">Date (Newest)</MenuItem>
                  <MenuItem value="start_date|asc">Date (Oldest)</MenuItem>
                  <MenuItem value="employee_name|asc">Employee (A–Z)</MenuItem>
                  <MenuItem value="employee_name|desc">Employee (Z–A)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* RESET & REFRESH */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                flexShrink: 0,
                pt: "24px",
              }}
            >
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setOrderBy("start_date");
                  setOrder("desc");
                }}
                sx={{
                  minWidth: 105,
                  borderRadius: 1.5,
                  whiteSpace: "nowrap",
                }}
              >
                Reset
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadRequests}
                disabled={loading}
                sx={{
                  minWidth: 105,
                  borderRadius: 1.5,
                  whiteSpace: "nowrap",
                }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              mt: 1.5,
              pt: 1.25,
              borderTop: "1px solid #E5E7EB",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Showing {sortedRequests.length} of {requests.length} records
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {order === "asc" ? "Ascending ↑" : "Descending ↓"}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #E5E7EB",
          width: "100%",
          minWidth: 0,
        }}
      >
        <CardContent
          sx={{
            p: { xs: 1, sm: 2 },
            "&:last-child": { pb: { xs: 1, sm: 2 } },
          }}
        >
          <TableContainer
            sx={{
              width: "100%",
              maxWidth: "100%",
              overflowX: "hidden",
            }}
          >
            <Table
              size="small"
              sx={{
                width: "100%",
                tableLayout: "fixed",
                "& th, & td": {
                  px: { xs: 0.6, sm: 1 },
                  py: 1.25,
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                },
              }}
            >
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "9%" }} />
              </colgroup>

              <TableHead>
                {/* GROUP HEADER */}
                <TableRow>
                  <TableCell sx={tableHeaderStyle} rowSpan={2}>
                    No.
                  </TableCell>

                  <TableCell sx={tableHeaderStyle} rowSpan={2}>
                    Date
                  </TableCell>

                  <TableCell sx={tableHeaderStyle} rowSpan={2}>
                    Employee
                  </TableCell>

                  <TableCell
                    sx={{ ...tableHeaderStyle, textAlign: "center" }}
                    align="center"
                    colSpan={2}
                  >
                    Check-in
                  </TableCell>

                  <TableCell
                    sx={{ ...tableHeaderStyle, textAlign: "center" }}
                    align="center"
                    colSpan={2}
                  >
                    Check-out
                  </TableCell>

                  <TableCell sx={tableHeaderStyle} rowSpan={2}>
                    Reason
                  </TableCell>

                  <TableCell sx={tableHeaderStyle} rowSpan={2}>
                    Status
                  </TableCell>

                  <TableCell sx={tableHeaderStyle} align="center" rowSpan={2}>
                    Action
                  </TableCell>
                </TableRow>

                {/* SUB HEADER */}
                <TableRow>
                  {sortableHeader("Previous", "old_check_in", "center")}
                  {sortableHeader("Correct", "new_check_in", "center")}
                  {sortableHeader("Previous", "old_check_out", "center")}
                  {sortableHeader("Correct", "new_check_out", "center")}
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 10 }).map((_, col) => (
                        <TableCell key={col}>
                          <Skeleton width={75} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sortedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography color="text.secondary" py={4}>
                        Tidak ada pengajuan yang sesuai filter.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRequests.map((item, index) => {
                    const status = statusConfig[item.status] || {
                      label: item.status || "-",
                      color: "default",
                    };

                    const pending = item.status === "PENDING_SUPERVISOR";

                    return (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{
                          "& td": {
                            py: 1.5,
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            verticalAlign: "middle",
                          },
                        }}
                      >
                        <TableCell>{index + 1}</TableCell>

                        <TableCell>{formatDate(item.start_date)}</TableCell>

                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                flexShrink: 0,
                                bgcolor: "primary.main",
                                fontSize: 13,
                              }}
                            >
                              {item.employee_name?.charAt(0)?.toUpperCase() ||
                                "?"}
                            </Avatar>

                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                fontWeight={600}
                                fontSize={13}
                                sx={{
                                  overflowWrap: "anywhere",
                                  lineHeight: 1.3,
                                }}
                              >
                                {item.employee_name || "-"}
                              </Typography>

                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: "block",
                                  overflowWrap: "anywhere",
                                  lineHeight: 1.25,
                                }}
                              >
                                {item.department || "-"}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell align="center">
                          {formatTime(item.old_check_in)}
                        </TableCell>

                        <TableCell align="center">
                          <Typography fontWeight={700} color="success.main">
                            {formatTime(item.new_check_in)}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          {formatTime(item.old_check_out)}
                        </TableCell>

                        <TableCell align="center">
                          <Typography fontWeight={700} color="success.main">
                            {formatTime(item.new_check_out)}
                          </Typography>
                        </TableCell>

                        <TableCell
                          sx={{
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ overflowWrap: "anywhere" }}
                          >
                            {item.reason || "-"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                            sx={{
                              maxWidth: "100%",
                              "& .MuiChip-label": {
                                whiteSpace: "normal",
                                overflowWrap: "anywhere",
                              },
                            }}
                          />
                        </TableCell>

                        <TableCell align="center">
                          {pending ? (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              justifyContent="center"
                            >
                              <IconButton
                                size="small"
                                color="success"
                                title="Approve"
                                onClick={() => openAction(item, "approve")}
                              >
                                <CheckCircleIcon />
                              </IconButton>

                              <IconButton
                                size="small"
                                color="error"
                                title="Reject"
                                onClick={() => openAction(item, "reject")}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Stack>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Selesai
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* APPROVAL DIALOG */}
      <Dialog
        open={Boolean(selected)}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialogType === "approve"
            ? "Approve Correction Request"
            : "Reject Correction Request"}
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {selected?.employee_name} · {formatDate(selected?.start_date)}
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label={
              dialogType === "approve"
                ? "Catatan (opsional)"
                : "Alasan penolakan"
            }
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Masukkan catatan..."
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={processing}>
            Batal
          </Button>

          <Button
            variant="contained"
            color={dialogType === "approve" ? "success" : "error"}
            onClick={submitAction}
            disabled={processing}
          >
            {processing ? (
              <CircularProgress size={20} color="inherit" />
            ) : dialogType === "approve" ? (
              "Setujui"
            ) : (
              "Tolak"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
