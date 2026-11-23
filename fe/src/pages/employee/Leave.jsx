import { useEffect, useState, useMemo } from "react";

import leaveService from "../../services/leaveService";
import paySlipService from "../../services/paySlipService";
import PaySlipRequestDialog from "../../components/attendance/PaySlipRequestDialog";
import LeaveDialog from "../../components/attendance/LeaveDialog";
import LeaveDetailDialog from "../../components/layout/LeaveDetailDialog";
import LeaveCard from "../../components/layout/LeaveCard";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Fab,
  Stack,
  Skeleton,
  Button,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import Swal from "sweetalert2";
import notificationService from "../../services/notificationService";
import overtimeService from "../../services/overtimeService";
import OvertimeDetailDialog from "../../components/layout/OvertimeDetailDialog";
import businessTripService from "../../services/businessTripService";
import BusinessTripDetailDialog from "../../components/layout/BusinessTripDetailDialog";

const countWorkingDays = (startDate, endDate, workDays) => {
  if (!startDate || !endDate || !Array.isArray(workDays)) {
    return 0;
  }

  const workingDays = new Set(workDays.map((day) => String(day).toUpperCase()));

  const dayNames = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return 0;
  }

  let total = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayName = dayNames[current.getDay()];

    if (workingDays.has(dayName)) {
      total++;
    }

    current.setDate(current.getDate() + 1);
  }

  return total;
};

export default function Leave() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [leaveType, setLeaveType] = useState("SAKIT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [paySlipDialogOpen, setPaySlipDialogOpen] = useState(false);
  const [paySlipPeriods, setPaySlipPeriods] = useState([]);
  const [paySlipRequests, setPaySlipRequests] = useState([]);
  const [selectedPaySlipPeriod, setSelectedPaySlipPeriod] = useState("");
  const [paySlipReason, setPaySlipReason] = useState("");
  const [paySlipLoading, setPaySlipLoading] = useState(false);
  const [paySlipError, setPaySlipError] = useState("");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [cutiType, setCutiType] = useState("TAHUNAN");
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [openDetail, setOpenDetail] = useState(false);
  const [openOvertimeDetail, setOpenOvertimeDetail] = useState(false);
  const [businessTripContext, setBusinessTripContext] = useState(null);
  const [openBusinessTripDetail, setOpenBusinessTripDetail] = useState(false);
  const [businessTrip, setBusinessTrip] = useState({
    destination: "",
    departureDate: "",
    returnDate: "",
    transportEstimate: "",
  });
  const [summary, setSummary] = useState({
    leave_balance: 0,
    cuti_taken_days: 0,
    sick_deduction_days: 0,
    special_leave_days: 0,
  });

  const selectedLeaveType = leaveTypes.find(
    (item) => String(item.id) === String(leaveTypeId),
  );

  const selectedLeaveDays = countWorkingDays(
    startDate,
    endDate,
    selectedLeaveType?.work_days,
  );
  const loadBusinessTripContext = async () => {
    try {
      const response = await businessTripService.getContext();

      setBusinessTripContext(response.data?.data || response.data || null);
    } catch (err) {
      console.error("LOAD BUSINESS TRIP CONTEXT ERROR:", err);
      setBusinessTripContext(null);
    }
  };
  const maxLeaveDays = Number(selectedLeaveType?.entitlement_days || 0);

  const isSpecialLeave =
    leaveType === "CUTI" && selectedLeaveType?.category === "SPECIAL";

  const isLeaveExceeded =
    isSpecialLeave && maxLeaveDays > 0 && selectedLeaveDays > maxLeaveDays;

  const [statusFilter, setStatusFilter] = useState("ALL");

  const normalizeStatus = (status) => {
    if (!status) return "";

    const value = String(status).toUpperCase();

    // Semua tahapan approval yang masih berjalan
    const pendingStatuses = [
      "PENDING",
      "PENDING_SUPERVISOR",
      "PENDING_MANAGER",
      "PENDING_HR",
      "PENDING_DIRECTOR",
      "PENDING_FINANCE",
      "DRAFT",
      "ON_TRIP",
      "SETTLEMENT",
    ];

    if (pendingStatuses.includes(value)) {
      return "PENDING";
    }

    if (["APPROVED", "COMPLETED"].includes(value)) {
      return "APPROVED";
    }

    if (["REJECTED", "REJECT"].includes(value)) {
      return "REJECTED";
    }

    if (value === "CANCELLED") {
      return "CANCELLED";
    }

    return value;
  };

  const loadLeaveTypes = async () => {
    try {
      const response = await leaveService.types();

      console.log(
        "RAW API RESPONSE: " + JSON.stringify(response.data, null, 2),
      );

      const result = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setLeaveTypes(result);

      console.log("PARSED LEAVE TYPES: " + JSON.stringify(result, null, 2));

      if (result.length > 0) {
        setLeaveTypeId(String(result[0].id));
      }
    } catch (err) {
      console.error("LOAD LEAVE TYPES ERROR:", err);
    }
  };
  const filteredHistory = useMemo(() => {
    console.log("FILTER DIPILIH:", statusFilter);

    console.log(
      "STATUS DATA:",
      history.map((item) => ({
        id: item.id,
        type: item.leave_type,
        status: item.status,
      })),
    );

    if (statusFilter === "ALL") {
      return history;
    }

    const result = history.filter((item) => {
      return normalizeStatus(item.status) === normalizeStatus(statusFilter);
    });

    console.log("HASIL FILTER:", result);

    return result;
  }, [history, statusFilter]);

  const statusCount = useMemo(
    () => ({
      ALL: history.length,

      PENDING: history.filter(
        (item) => normalizeStatus(item.status) === "PENDING",
      ).length,

      APPROVED: history.filter(
        (item) => normalizeStatus(item.status) === "APPROVED",
      ).length,

      REJECTED: history.filter(
        (item) => normalizeStatus(item.status) === "REJECTED",
      ).length,

      CANCELLED: history.filter(
        (item) => normalizeStatus(item.status) === "CANCELLED",
      ).length,
    }),
    [history],
  );

  const loadPaySlipData = async () => {
    try {
      const [periodResponse, requestResponse] = await Promise.all([
        paySlipService.getAvailablePeriods(),
        paySlipService.getMyRequests(),
      ]);

      const periods = periodResponse.data?.data || [];
      const requests = requestResponse.data?.data || [];

      setPaySlipPeriods(periods);
      setPaySlipRequests(requests);
    } catch (err) {
      console.error("LOAD PAY SLIP DATA ERROR:", err);
    }
  };

  const handlePaySlipSubmit = async () => {
    if (!selectedPaySlipPeriod) {
      setPaySlipError("Pilih periode payroll terlebih dahulu.");
      return;
    }

    try {
      setPaySlipLoading(true);
      setPaySlipError("");

      await paySlipService.createRequest({
        payroll_period_id: Number(selectedPaySlipPeriod),
        reason: paySlipReason.trim() || null,
      });

      setPaySlipDialogOpen(false);
      setSelectedPaySlipPeriod("");
      setPaySlipReason("");

      await loadPaySlipData();

      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Pay slip request submitted successfully.",
      });
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to submit pay slip request.";

      setPaySlipError(message);

      if (err.response?.status !== 409) {
        console.error("PAY SLIP REQUEST ERROR:", err);
      }
    } finally {
      setPaySlipLoading(false);
    }
  };

  const handleDownloadPaySlip = async (requestId) => {
    try {
      const response = await paySlipService.downloadSlip(requestId);

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const fileName = `Pay-Slip-${requestId}.pdf`;

      // ANDROID / CAPACITOR
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");

        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onloadend = () => {
            const result = reader.result;
            resolve(result.split(",")[1]);
          };

          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });

        await Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: `Pay Slip berhasil disimpan di Documents.`,
          confirmButtonText: "OK",
        });

        console.log("PAYSLIP SAVED:", savedFile.uri);
        return;
      }

      // BROWSER / DESKTOP
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error("DOWNLOAD PAY SLIP ERROR:", error);

      Swal.fire(
        "Gagal",
        error?.response?.data?.message ||
          "Pay Slip belum tersedia atau gagal diunduh.",
        "error",
      );
    }
  };

  const paySlipStatusLabel = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
  };

  useEffect(() => {
    loadHistory();
    loadLeaveTypes();
    loadBusinessTripContext();
    loadPaySlipData();

    const markNotificationsAsRead = async () => {
      try {
        await notificationService.readResult();
      } catch (err) {
        console.error("Gagal membaca notification:", err);
      }
    };

    markNotificationsAsRead();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        leaveService.history(),
        overtimeService.history(),
        businessTripService.history(),
      ]);

      const parseData = (result) => {
        if (result.status !== "fulfilled") {
          console.error("HISTORY API ERROR:", result.reason);
          return [];
        }

        const response = result.value?.data;

        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;

        return [];
      };

      // Ambil ringkasan cuti dari response API leave/history.
      // Backend mengirim summary dan data dalam satu response.
      const leaveResponse =
        results[0].status === "fulfilled" ? results[0].value?.data : null;

      if (leaveResponse?.summary) {
        setSummary({
          leave_balance: Number(leaveResponse.summary.leave_balance ?? 0),
          cuti_taken_days: Number(leaveResponse.summary.cuti_taken_days ?? 0),
          sick_deduction_days: Number(
            leaveResponse.summary.sick_deduction_days ?? 0,
          ),
          special_leave_days: Number(
            leaveResponse.summary.special_leave_days ?? 0,
          ),
        });
      }

      const leaveData = parseData(results[0]);
      const overtimeData = parseData(results[1]);
      const businessTripData = parseData(results[2]);

      const overtimeHistory = overtimeData.map((item) => ({
        ...item,
        leave_type: "LEMBUR",
        start_date: item.overtime_date,
        end_date: item.overtime_date,
      }));

      const businessTripHistory = businessTripData.map((item) => ({
        ...item,
        leave_type: "BUSINESS_TRIP",
        start_date: item.departure_date,
        end_date: item.return_date,
        reason: item.purpose,
      }));

      const combinedHistory = [
        ...leaveData,
        ...overtimeHistory,
        ...businessTripHistory,
      ].sort((a, b) => {
        const dateA = new Date(
          a.departure_date || a.overtime_date || a.start_date || 0,
        );

        const dateB = new Date(
          b.departure_date || b.overtime_date || b.start_date || 0,
        );

        return dateB - dateA;
      });

      setHistory(combinedHistory);
    } catch (err) {
      console.error("LOAD HISTORY ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const leaveTypeLabel = {
    SAKIT: "Sick Leave",
    IZIN: "Permission",
    CUTI: "Leave",
    DINAS: "Business Travel",
    BUSINESS_TRIP: "Business Travel",
    CLIENT: "Client Visit",
    MEETING: "Meeting",
    WFH: "Work From Home",
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (leaveType === "BUSINESS_TRIP") {
      if (
        !businessTrip.destination.trim() ||
        !businessTrip.departureDate ||
        !businessTrip.returnDate ||
        !reason.trim() ||
        businessTrip.transportEstimate === ""
      ) {
        Swal.fire({
          icon: "warning",
          title: "Data belum lengkap",
          text: "Lengkapi tujuan, tanggal perjalanan, estimasi transportasi, dan keperluan perjalanan.",
        });
        return;
      }

      if (businessTrip.returnDate < businessTrip.departureDate) {
        Swal.fire({
          icon: "warning",
          title: "Tanggal tidak valid",
          text: "Tanggal kembali tidak boleh lebih awal dari tanggal berangkat.",
        });
        return;
      }

      if (
        !Number.isFinite(Number(businessTrip.transportEstimate)) ||
        Number(businessTrip.transportEstimate) < 0
      ) {
        Swal.fire({
          icon: "warning",
          title: "Estimasi transportasi tidak valid",
        });
        return;
      }

      try {
        setSubmitLoading(true);

        await businessTripService.create({
          destination: businessTrip.destination.trim(),
          purpose: reason.trim(),
          departure_date: businessTrip.departureDate,
          return_date: businessTrip.returnDate,
          transport_estimate: Number(businessTrip.transportEstimate),
        });

        setOpenDialog(false);

        await Swal.fire({
          icon: "success",
          title: "Success",
          text: "Business Trip request submitted successfully.",
        });

        setLeaveType("SAKIT");
        setStartDate("");
        setEndDate("");
        setReason("");
        setAttachment(null);

        setBusinessTrip({
          destination: "",
          departureDate: "",
          returnDate: "",
          transportEstimate: "",
        });

        await loadHistory();
      } catch (err) {
        console.error("BUSINESS TRIP SUBMIT ERROR:", err);

        Swal.fire({
          icon: "error",
          title: "Failed",
          text:
            err.response?.data?.message ||
            "Failed to submit Business Trip request.",
        });
      } finally {
        setSubmitLoading(false);
      }

      return;
    }
    // =====================================
    // VALIDASI UMUM
    // =====================================
    if (leaveType === "CUTI" && isLeaveExceeded) {
      return;
    }
    if (!startDate) {
      Swal.fire({
        icon: "warning",
        title: "Date is incomplete",
      });

      return;
    }

    if (!reason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Details are required",
      });

      return;
    }

    // =====================================
    // KHUSUS LEMBUR
    // =====================================

    if (leaveType === "LEMBUR") {
      if (!startTime || !endTime) {
        Swal.fire({
          icon: "warning",
          title: "Overtime hours are incomplete",
          text: "Start and end times are required.",
        });

        return;
      }

      if (endTime === startTime) {
        Swal.fire({
          icon: "warning",
          title: "Invalid overtime hours",
          text: "Start and end times cannot be the same.",
        });

        return;
      }

      try {
        setSubmitLoading(true);

        await overtimeService.create({
          overtime_date: startDate,
          start_time: startTime,
          end_time: endTime,
          reason: reason,
        });
        await loadHistory();
        setOpenDialog(false);
        await Swal.fire({
          icon: "success",
          title: "Success",
          text: "Overtime request submitted successfully.",
        });

        // RESET FORM

        setLeaveType("SAKIT");

        setStartDate("");
        setEndDate("");

        setStartTime("");
        setEndTime("");

        setReason("");
        setAttachment(null);

        // Untuk sementara history leave
        // belum memuat lembur.
        // Nanti kita gabungkan di tahap history.
      } catch (err) {
        console.error(err);

        Swal.fire({
          icon: "error",
          title: "Failed",
          text:
            err.response?.data?.message || "Failed to submit overtime request.",
        });
      } finally {
        setSubmitLoading(false);
      }

      return;
    }

    // =====================================
    // CUTI / IZIN / SAKIT
    // =====================================

    if (leaveType === "IZIN") {
      if (!startTime || !endTime) {
        Swal.fire({
          icon: "warning",
          title: "Permission hours are incomplete",
          text: "Start and end times are required.",
        });
        return;
      }

      if (endTime <= startTime) {
        Swal.fire({
          icon: "warning",
          title: "Invalid permission hours",
          text: "End time must be later than start time.",
        });
        return;
      }
    } else if (!endDate) {
      Swal.fire({
        icon: "warning",
        title: "Date is incomplete",
      });
      return;
    }

    try {
      setSubmitLoading(true);

      const formData = new FormData();

      formData.append("leave_type", leaveType);

      if (leaveType === "CUTI") {
        const selectedType = leaveTypes.find(
          (item) => String(item.id) === String(leaveTypeId),
        );

        if (!selectedType) {
          Swal.fire({
            icon: "warning",
            title: "Jenis cuti belum dipilih",
          });
          return;
        }

        formData.append("leave_type_id", selectedType.id);
        formData.append("leave_category", selectedType.category);
      }

      formData.append("start_date", startDate);
      formData.append("end_date", leaveType === "IZIN" ? startDate : endDate);

      if (leaveType === "IZIN") {
        formData.append("start_time", startTime);
        formData.append("end_time", endTime);
      }

      formData.append("reason", reason);

      if (attachment) {
        formData.append("attachment", attachment);
      }

      await leaveService.create(formData);

      // Tutup dialog pengajuan dulu
      setOpenDialog(false);

      // Baru tampilkan SweetAlert
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Request submitted successfully.",
        confirmButtonText: "OK",
      });
      setLeaveType("SAKIT");

      setStartDate("");
      setEndDate("");

      setStartTime("");
      setEndTime("");

      setReason("");
      setAttachment(null);

      loadHistory();
    } catch (err) {
      console.log("LEAVE ERROR RESPONSE:", err.response?.data);
      console.log("LEAVE ERROR CODE:", err.response?.data?.code);

      const errorCode = err.response?.data?.code;
      const errorMessage = err.response?.data?.message || "An error occurred.";

      if (errorCode === "SPECIAL_LEAVE_ALREADY_USED") {
        setSubmitError(errorMessage);
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: errorMessage,
        });
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const chipStyle = (value) => ({
    borderRadius: 5,
    px: 0.5,
    transition: ".2s",
    transform: statusFilter === value ? "scale(1.05)" : "scale(1)",
  });

  return (
    <Box
      sx={{
        bgcolor: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: "sticky",
          top: 8,
          zIndex: 1000,
          bgcolor: "#F5F7FA",
          px: 2,
          pt: 2,
          pb: 2,
          borderBottom: "1px solid #ECEFF1",
          boxShadow: "0 2px 10px rgba(0,0,0,.05)",
        }}
      >
        <Card
          sx={{
            mb: 3,
            background: "#0d439a",
            color: "#fff",
          }}
        >
          <CardContent>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
              Application
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr 1fr",
                  sm: "repeat(4, 1fr)",
                },
                gap: 2,
              }}
            >
              {/* SISA CUTI */}

              <Box>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Annual Leave Balance
                </Typography>

                <Typography variant="h5" fontWeight={700}>
                  {summary.leave_balance} days
                </Typography>
              </Box>

              {/* CUTI DIAMBIL */}

              <Box>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Leave Taken
                </Typography>

                <Typography variant="h5" fontWeight={700}>
                  {summary.cuti_taken_days} days
                </Typography>
              </Box>

              {/* SAKIT POTONG CUTI */}

              <Box>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Sick Leave Deduction
                </Typography>

                <Typography variant="h5" fontWeight={700}>
                  {summary.sick_deduction_days} days
                </Typography>
              </Box>

              {/* CUTI KHUSUS */}

              <Box>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Special Leave
                </Typography>

                <Typography variant="h5" fontWeight={700}>
                  {summary.special_leave_days} days
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box
          sx={{
            overflowX: "auto",
            pb: 2,

            "&::-webkit-scrollbar": {
              display: "none",
            },

            scrollbarWidth: "none",
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              width: "max-content",
            }}
          >
            <Chip
              label={`All (${statusCount.ALL})`}
              sx={{ gap: 1 }}
              clickable
              color={statusFilter === "ALL" ? "primary" : "default"}
              onClick={() => setStatusFilter("ALL")}
            />

            <Chip
              label={`Pending (${statusCount.PENDING})`}
              clickable
              sx={chipStyle("PENDING")}
              color={statusFilter === "PENDING" ? "warning" : "default"}
              onClick={() => setStatusFilter("PENDING")}
            />

            <Chip
              label={`Approved (${statusCount.APPROVED})`}
              clickable
              sx={chipStyle("APPROVED")}
              color={statusFilter === "APPROVED" ? "success" : "default"}
              onClick={() => setStatusFilter("APPROVED")}
            />

            <Chip
              label={`Rejected (${statusCount.REJECTED})`}
              clickable
              sx={chipStyle("REJECTED")}
              color={statusFilter === "REJECTED" ? "error" : "default"}
              onClick={() => setStatusFilter("REJECTED")}
            />

            <Chip
              label={`Cancelled (${statusCount.CANCELLED})`}
              clickable
              sx={{ gap: 1 }}
              color={statusFilter === "CANCELLED" ? "primary" : "default"}
              onClick={() => setStatusFilter("CANCELLED")}
            />
          </Stack>{" "}
        </Box>
      </Box>
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 12,
        }}
      >
        {loading ? (
          [...Array(4)].map((_, index) => (
            <Card
              key={index}
              sx={{
                mb: 2,
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Skeleton variant="text" width={130} height={28} />

                  <Skeleton variant="rounded" width={90} height={28} />
                </Box>

                <Skeleton
                  variant="text"
                  width="70%"
                  height={24}
                  sx={{ mt: 1 }}
                />

                <Skeleton
                  variant="text"
                  width="90%"
                  height={18}
                  sx={{ mt: 0.5 }}
                />
              </CardContent>
            </Card>
          ))
        ) : filteredHistory.length === 0 ? (
          <Card
            sx={{
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Typography align="center" color="text.secondary">
                No request history yet.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          filteredHistory.map((item) => {
            const selectedType = leaveTypes.find(
              (type) => String(type.id) === String(item.leave_type_id),
            );
            return (
              <LeaveCard
                key={`${item.leave_type}-${item.id}`}
                item={{
                  ...item,
                  leave_type_name: selectedType?.name || item.leave_type_name,
                }}
                onClick={() => {
                  setSelectedLeave(item);

                  if (item.leave_type === "LEMBUR") {
                    setOpenOvertimeDetail(true);
                  } else if (
                    ["BUSINESS_TRIP", "DINAS"].includes(
                      String(item.leave_type || "").toUpperCase(),
                    )
                  ) {
                    setOpenBusinessTripDetail(true);
                  } else {
                    setOpenDetail(true);
                  }
                }}
              />
            );
          })
        )}
        <Card sx={{ mb: 2, borderRadius: 3 }}>
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography fontWeight={700}>Pay Slip Requests</Typography>
                <Typography variant="body2" color="text.secondary">
                  Track your payslip requests here.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<DescriptionRoundedIcon />}
                onClick={() => {
                  setPaySlipError("");
                  setPaySlipDialogOpen(true);
                }}
              >
                Request Pay Slip
              </Button>
            </Stack>

            {paySlipRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No pay slip requests yet.
              </Typography>
            ) : (
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {paySlipRequests.map((item) => {
                  const statusColor =
                    item.status === "COMPLETED"
                      ? "success"
                      : item.status === "REJECTED"
                        ? "error"
                        : item.status === "PROCESSING"
                          ? "info"
                          : "warning";

                  return (
                    <Box
                      key={item.id}
                      sx={{
                        p: 1.5,
                        border: "1px solid #e5e7eb",
                        borderRadius: 2,
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Typography fontWeight={600}>
                          {item.period_name}
                        </Typography>
                        <Chip
                          size="small"
                          color={statusColor}
                          label={paySlipStatusLabel[item.status] || item.status}
                        />
                      </Stack>
                      {item.reason && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          Reason: {item.reason}
                        </Typography>
                      )}
                      {item.admin_note && (
                        <Alert
                          severity={
                            item.status === "REJECTED" ? "error" : "info"
                          }
                          sx={{ mt: 1 }}
                        >
                          {item.admin_note}
                        </Alert>
                      )}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 0.5 }}
                      >
                        Submitted:{" "}
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString(
                              "id-ID",
                            )
                          : "-"}
                      </Typography>
                      {item.status === "COMPLETED" && item.has_file && (
                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          startIcon={<DescriptionRoundedIcon />}
                          sx={{ mt: 1.25, textTransform: "none" }}
                          onClick={() => handleDownloadPaySlip(item.id)}
                        >
                          Download Slip Gaji
                        </Button>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        <BusinessTripDetailDialog
          open={openBusinessTripDetail}
          onClose={() => setOpenBusinessTripDetail(false)}
          data={selectedLeave}
        />
      </Box>
      <Fab
        color="primary"
        onClick={() => setOpenDialog(true)}
        sx={{
          position: "fixed",

          // Posisi mengikuti Bottom Navigation + Safe Area iOS
          bottom: "calc(12px + env(safe-area-inset-bottom, 0px) + 68px + 16px)",

          right: 20,
          bgcolor: "#0d439a",

          // Pastikan FAB berada di atas Bottom Navigation
          zIndex: 1301,

          "&:hover": {
            bgcolor: "#0d439a",
          },
        }}
      >
        <AddRoundedIcon />
      </Fab>
      <LeaveDialog
        startTime={startTime}
        setStartTime={setStartTime}
        cutiType={cutiType}
        setCutiType={setCutiType}
        endTime={endTime}
        setEndTime={setEndTime}
        open={openDialog}
        onClose={() => {
          setBusinessTrip({
            destination: "",
            departureDate: "",
            returnDate: "",
            transportEstimate: "",
          });
          setOpenDialog(false);
          setSubmitError("");
          setLeaveType("SAKIT");

          setStartDate("");

          setEndDate("");

          setStartTime("");
          setEndTime("");

          setReason("");

          setAttachment(null);
        }}
        leaveType={leaveType}
        setLeaveType={setLeaveType}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        reason={reason}
        setReason={setReason}
        attachment={attachment}
        setAttachment={setAttachment}
        loading={submitLoading}
        submitError={submitError}
        setSubmitError={setSubmitError}
        onSubmit={handleSubmit}
        leaveTypes={leaveTypes}
        leaveTypeId={leaveTypeId}
        setLeaveTypeId={setLeaveTypeId}
        selectedLeaveDays={selectedLeaveDays}
        maxLeaveDays={maxLeaveDays}
        isSpecialLeave={isSpecialLeave}
        isLeaveExceeded={isLeaveExceeded}
        businessTrip={businessTrip}
        setBusinessTrip={setBusinessTrip}
        businessTripContext={businessTripContext}
      />
      <PaySlipRequestDialog
        open={paySlipDialogOpen}
        onClose={() => {
          if (paySlipLoading) return;
          setPaySlipDialogOpen(false);
          setSelectedPaySlipPeriod("");
          setPaySlipReason("");
          setPaySlipError("");
        }}
        periods={paySlipPeriods}
        selectedPeriod={selectedPaySlipPeriod}
        setSelectedPeriod={setSelectedPaySlipPeriod}
        reason={paySlipReason}
        setReason={setPaySlipReason}
        loading={paySlipLoading}
        error={paySlipError}
        onSubmit={handlePaySlipSubmit}
      />
      <LeaveDetailDialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        data={selectedLeave}
      />
      <OvertimeDetailDialog
        open={openOvertimeDetail}
        onClose={() => setOpenOvertimeDetail(false)}
        data={selectedLeave}
      />
    </Box>
  );
}
