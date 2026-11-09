import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
  TableHead,
  TableRow,
  TextField,
  Typography,
  Select,
  IconButton,
  Tooltip,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseIcon from "@mui/icons-material/Close";

import * as XLSX from "xlsx";
import attendanceService from "../../services/attService";

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
};

const getStatusColor = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "error";
    case "PENDING":
    case "PENDING_SUPERVISOR":
      return "warning";
    default:
      return "default";
  }
};

const getStatusLabel = (status) => {
  const value = String(status || "").toUpperCase();

  if (value === "PENDING_SUPERVISOR" || value === "PENDING") {
    return "Pending";
  }

  if (value === "APPROVED") return "Approved";
  if (value === "REJECTED") return "Rejected";

  return status || "-";
};

const isImageAttachment = (url = "") => {
  const cleanUrl = url.split("?")[0].toLowerCase();

  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(cleanUrl);
};

export default function LeaveHistory() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // FILTERS
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // DETAIL
  const [actionType, setActionType] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);

  // PAGINATION
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadLeaveHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      if (search.trim()) params.employee = search.trim();

      if (departmentFilter !== "ALL") {
        params.department = departmentFilter;
      }

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      if (typeFilter !== "ALL") {
        params.leave_type = typeFilter;
      }

      const result = await attendanceService.getLeaveHistory(params);

      if (!result.success) {
        throw new Error(result.message || "Failed to load leave history.");
      }

      setRequests(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("GET LEAVE HISTORY ERROR:", err);

      setRequests([]);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load leave history.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeaveHistory();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, startDate, endDate, departmentFilter, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    startDate,
    endDate,
    departmentFilter,
    statusFilter,
    typeFilter,
    rowsPerPage,
  ]);

  const departments = useMemo(
    () =>
      [
        ...new Set(requests.map((item) => item.department).filter(Boolean)),
      ].sort(),
    [requests],
  );

  const leaveTypes = useMemo(
    () =>
      [
        ...new Set(requests.map((item) => item.leave_type).filter(Boolean)),
      ].sort(),
    [requests],
  );

  const totalPages = Math.ceil(requests.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;

  const paginatedRequests = requests.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  const handleExportExcel = () => {
    if (requests.length === 0) {
      alert("There is no data to export.");
      return;
    }

    const exportData = requests.map((item, index) => ({
      No: index + 1,
      Employee: item.employee_name || "-",
      Email: item.email || "-",
      Department: item.department || "-",
      Position: item.position || "-",
      "Leave Type": item.leave_type || "-",
      Category: item.leave_category || "-",
      "Start Date": formatDate(item.start_date),
      "End Date": formatDate(item.end_date),
      "Start Time": item.start_time || "-",
      "End Time": item.end_time || "-",
      Reason: item.reason || "-",
      Status: getStatusLabel(item.status),
      "Approval Note": item.approval_note || "-",
      "Approved By": item.approved_by_name || "-",
      "Approved At": formatDateTime(item.approved_at),
      "Submitted At": formatDateTime(item.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Leave History");

    XLSX.writeFile(
      workbook,
      `Leave_History_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const handleResetFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setDepartmentFilter("ALL");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  const handleLeaveDecision = async () => {
    if (!selectedRequest?.id || !actionType) return;

    try {
      setProcessing(true);

      const service =
        actionType === "APPROVE"
          ? attendanceService.approveLeave
          : attendanceService.rejectLeave;

      const result = await service(selectedRequest.id, approvalNote.trim());

      if (!result.success) {
        throw new Error(result.message || "Gagal memproses pengajuan.");
      }

      alert(
        actionType === "APPROVE"
          ? "Pengajuan berhasil disetujui."
          : "Pengajuan berhasil ditolak.",
      );

      setOpenDetail(false);
      setSelectedRequest(null);
      setActionType("");
      setApprovalNote("");

      await loadLeaveHistory();
    } catch (err) {
      console.error("LEAVE DECISION ERROR:", err);
      alert(
        err.response?.data?.message ||
          err.message ||
          "Gagal memproses pengajuan.",
      );
    } finally {
      setProcessing(false);
    }
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
          {/* FILTERS */}
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
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: { xs: "100%", md: 220 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              size="small"
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
              }}
              sx={{ minWidth: 190 }}
            />

            <TextField
              size="small"
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: startDate || undefined },
              }}
              sx={{ minWidth: 190 }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentFilter}
                label="Department"
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Departments</MenuItem>
                {departments.map((department) => (
                  <MenuItem key={department} value={department}>
                    {department}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="PENDING_SUPERVISOR">Pending</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Leave Type</InputLabel>
              <Select
                value={typeFilter}
                label="Leave Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Types</MenuItem>
                {leaveTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              onClick={handleResetFilters}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              Reset
            </Button>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              disabled={loading || requests.length === 0}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              Export Excel
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
              label={`Total Requests: ${requests.length}`}
              variant="outlined"
            />
          </Stack>

          {/* TABLE */}
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center" width={60}>
                    No.
                  </TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Approved By</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 8 }).map((__, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton variant="text" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : paginatedRequests.map((item, index) => (
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
                              src={item.employee_photo || undefined}
                              alt={item.employee_name || "Employee"}
                              imgProps={{ loading: "lazy" }}
                              sx={{
                                width: 42,
                                height: 42,
                                fontSize: 16,
                              }}
                            >
                              {item.employee_name?.charAt(0)?.toUpperCase() ||
                                "?"}
                            </Avatar>
                            <Box>
                              <Typography fontWeight={600} fontSize={14}>
                                {item.employee_name || "-"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {item.email || "-"}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>{item.department || "-"}</TableCell>

                        <TableCell>
                          <Typography fontWeight={600} fontSize={13}>
                            {item.leave_type === "CUTI"
                              ? `${item.leave_type_name || "Cuti"}`
                              : item.leave_type || "-"}
                          </Typography>

                          {item.leave_type === "CUTI" && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.master_leave_category ||
                                item.leave_category ||
                                "-"}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography fontSize={13}>
                            {formatDate(item.start_date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            to {formatDate(item.end_date)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={getStatusLabel(item.status)}
                            color={getStatusColor(item.status)}
                          />
                        </TableCell>

                        <TableCell>{item.approved_by_name || "-"}</TableCell>

                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setSelectedRequest(item);
                                setOpenDetail(true);
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}

                {!loading && requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" py={4}>
                        {error || "No leave or permission records found."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          {/* PAGINATION */}
          <Box
            sx={{
              mt: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Total requests: {requests.length}
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                select
                size="small"
                label="Rows per page"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                sx={{ width: 130 }}
              >
                {[10, 25, 50, 100].map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>

              <Pagination
                count={Math.max(totalPages, 1)}
                page={Math.min(page, Math.max(totalPages, 1))}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
              />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* DETAIL DIALOG */}
      <Dialog
        open={openDetail}
        onClose={() => {
          setOpenDetail(false);
          setSelectedRequest(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Typography fontSize={20} sx={{ fontWeight: "bold" }}>
              Leave & Permission Details
            </Typography>

            <IconButton
              size="small"
              onClick={() => {
                setOpenDetail(false);
                setSelectedRequest(null);
              }}
              sx={{ ml: 2 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {selectedRequest && (
            <Stack spacing={2.5}>
              {/* EMPLOYEE PROFILE */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "grey.50",
                }}
              >
                <Avatar
                  src={
                    selectedRequest.employee_photo ||
                    selectedRequest.photo ||
                    undefined
                  }
                  alt={selectedRequest.employee_name || "Employee"}
                  sx={{
                    width: 76,
                    height: 76,
                    fontSize: 28,
                    border: "3px solid white",
                    boxShadow: 1,
                  }}
                >
                  {selectedRequest.employee_name?.charAt(0)?.toUpperCase() ||
                    "?"}
                </Avatar>

                <Box flex={1} minWidth={0}>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedRequest.employee_name || "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedRequest.position || "-"} ·{" "}
                    {selectedRequest.department || "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedRequest.email || "-"}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={getStatusLabel(selectedRequest.status)}
                  color={getStatusColor(selectedRequest.status)}
                />
              </Box>

              {/* REQUEST INFORMATION */}
              <Box>
                <Typography fontWeight={700} mb={1.5}>
                  Request Information
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr 1fr",
                      sm: "repeat(3, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Leave Type
                    </Typography>
                    <Typography fontWeight={600}>
                      {selectedRequest.leave_type === "CUTI"
                        ? `${selectedRequest.leave_type_name || "Cuti"}`
                        : selectedRequest.leave_type || "-"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Category
                    </Typography>
                    <Typography fontWeight={600}>
                      {selectedRequest.master_leave_category ||
                        selectedRequest.leave_category ||
                        "-"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Submitted At
                    </Typography>
                    <Typography fontWeight={600}>
                      {formatDateTime(selectedRequest.created_at)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Start Date
                    </Typography>
                    <Typography fontWeight={600}>
                      {formatDate(selectedRequest.start_date)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      End Date
                    </Typography>
                    <Typography fontWeight={600}>
                      {formatDate(selectedRequest.end_date)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Time
                    </Typography>
                    <Typography fontWeight={600}>
                      {selectedRequest.start_time || selectedRequest.end_time
                        ? `${selectedRequest.start_time || "-"} - ${selectedRequest.end_time || "-"}`
                        : "Full Day"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* REASON */}
              <Box>
                <Typography fontWeight={700} mb={1}>
                  Reason
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "grey.50",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {selectedRequest.reason || "-"}
                  </Typography>
                </Box>
              </Box>

              {/* ATTACHMENT */}
              {selectedRequest.attachment_url && (
                <Box>
                  <Typography fontWeight={700} mb={1}>
                    Attachment
                  </Typography>

                  {isImageAttachment(selectedRequest.attachment_url) ? (
                    <Box
                      component="a"
                      href={selectedRequest.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        display: "inline-block",
                        maxWidth: "100%",
                      }}
                    >
                      <Box
                        component="img"
                        src={selectedRequest.attachment_url}
                        alt="Leave attachment"
                        sx={{
                          display: "block",
                          maxWidth: "100%",
                          maxHeight: 320,
                          objectFit: "contain",
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          cursor: "pointer",
                        }}
                      />
                    </Box>
                  ) : (
                    <Button
                      component="a"
                      href={selectedRequest.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                    >
                      View Attachment
                    </Button>
                  )}
                </Box>
              )}

              <Divider />

              {/* APPROVAL INFORMATION */}
              <Box>
                <Typography fontWeight={700} mb={1.5}>
                  Approval Information
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr 1fr",
                      sm: "repeat(3, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Approved By
                    </Typography>
                    <Typography fontWeight={600}>
                      {selectedRequest.approved_by_name || "-"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Approved At
                    </Typography>
                    <Typography fontWeight={600}>
                      {formatDateTime(selectedRequest.approved_at)}
                    </Typography>
                  </Box>
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Approval Note
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      p: 1.5,
                      bgcolor: "grey.50",
                      borderRadius: 2,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedRequest.approval_note || "-"}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: "space-between",
          }}
        >
          {selectedRequest?.status === "PENDING_SUPERVISOR" ||
          selectedRequest?.status === "PENDING" ? (
            <Stack direction="row" spacing={1}>
              <Button
                color="error"
                variant="outlined"
                disabled={processing}
                onClick={() => {
                  setActionType("REJECT");
                  setApprovalNote("");
                }}
              >
                Reject
              </Button>

              <Button
                color="success"
                variant="contained"
                disabled={processing}
                onClick={() => {
                  setActionType("APPROVE");
                  setApprovalNote("");
                }}
              >
                Approve
              </Button>
            </Stack>
          ) : (
            <Box />
          )}

          <Button
            disabled={processing}
            onClick={() => {
              setOpenDetail(false);
              setSelectedRequest(null);
              setActionType("");
              setApprovalNote("");
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(actionType)}
        onClose={() => {
          if (!processing) {
            setActionType("");
            setApprovalNote("");
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {actionType === "APPROVE"
            ? "Approve Leave Request"
            : "Reject Leave Request"}
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {actionType === "APPROVE"
              ? "Apakah kamu yakin ingin menyetujui pengajuan ini?"
              : "Apakah kamu yakin ingin menolak pengajuan ini?"}
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Approval Note"
            placeholder="Tambahkan catatan (opsional)"
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            disabled={processing}
            onClick={() => {
              setActionType("");
              setApprovalNote("");
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color={actionType === "APPROVE" ? "success" : "error"}
            disabled={processing}
            onClick={handleLeaveDecision}
          >
            {processing
              ? "Processing..."
              : actionType === "APPROVE"
                ? "Confirm Approval"
                : "Confirm Rejection"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
