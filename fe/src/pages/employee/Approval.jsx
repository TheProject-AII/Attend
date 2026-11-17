import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  Skeleton,
} from "@mui/material";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import leaderService from "../../services/leaderService";
import notificationService from "../../services/notificationService";
import overtimeService from "../../services/overtimeService";
import businessTripService from "../../services/businessTripService";

export default function Approval() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const isPending = (status) =>
    ["PENDING", "PENDING_MANAGER", "PENDING_SUPERVISOR"].includes(status);

  const loadData = async () => {
    try {
      setLoading(true);

      const [leaveResponse, overtimeResponse, businessTripResponse] =
        await Promise.all([
          leaderService.getLeaveApprovals("ALL"),
          overtimeService.managerHistory(),
          businessTripService.getManagerApprovals(),
        ]);

      const leaveData = leaveResponse.data?.data || [];

      const overtimeData = overtimeResponse.data?.data || [];

      const businessTripData = businessTripResponse.data?.data || [];

      const overtimeRequests = overtimeData.map((item) => ({
        ...item,
        request_type: "OVERTIME",
        leave_type: "LEMBUR",
        start_date: item.overtime_date,
        end_date: item.overtime_date,
      }));

      const businessTripRequests = businessTripData.map((item) => ({
        ...item,
        request_type: "BUSINESS_TRIP",
        leave_type: "BUSINESS_TRIP",
        name: item.employee_name,
        start_date: item.departure_date,
        end_date: item.return_date,
      }));

      const combined = [
        ...leaveData,
        ...overtimeRequests,
        ...businessTripRequests,
      ].sort((a, b) => {
        return new Date(b.start_date || 0) - new Date(a.start_date || 0);
      });

      setRequests(combined);

      setSummary({
        pending: combined.filter((item) => isPending(item.status)).length,

        approved: combined.filter((item) => item.status === "APPROVED").length,

        rejected: combined.filter((item) => item.status === "REJECTED").length,

        total: combined.length,
      });
    } catch (err) {
      console.error("Failed to load approval requests:", err);
      console.error("Response:", err.response?.data);

      setRequests([]);

      setSummary({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const markNotificationsAsRead = async () => {
      try {
        await notificationService.readPending();
      } catch (err) {
        console.error("Failed to mark notifications as read:", err);
      }
    };

    markNotificationsAsRead();
  }, []);

  const filtered = requests.filter((item) => {
    if (statusFilter === "ALL") return true;

    if (statusFilter === "PENDING") {
      return isPending(item.status);
    }

    return item.status === statusFilter;
  });

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "-";

    const match = String(value).match(/(?:T|\s)(\d{2}):(\d{2})/);

    return match ? `${match[1]}:${match[2]}` : "-";
  };

  const openDetail = (item) => {
    if (item.request_type === "OVERTIME") {
      navigate(`/employee/approval/overtime/${item.id}`);
      return;
    }

    if (item.request_type === "ATTENDANCE_EDIT") {
      navigate(`/employee/approval/attendance/${item.id}`);
      return;
    }

    if (item.request_type === "BUSINESS_TRIP") {
      navigate(`/employee/approval/business-trip/${item.id}`);
      return;
    }

    navigate(`/employee/approval/${item.id}`);
  };

  const getRequestLabel = (item) => {
    if (item.request_type === "BUSINESS_TRIP") {
      return "Business Travel";
    }

    if (item.leave_type === "CUTI") {
      return item.leave_type_name || "Leave";
    }

    return (
      {
        IZIN: "Permission",
        SAKIT: "Sick Leave",
        LEMBUR: "Overtime",
        CLIENT: "Client Visit",
      }[item.leave_type] ||
      item.leave_type ||
      "-"
    );
  };

  const getStatusLabel = (status) => {
    if (isPending(status)) return "Pending";
    if (status === "APPROVED") return "Approved";
    if (status === "REJECTED") return "Rejected";
    return status;
  };

  const getStatusColor = (status) => {
    if (isPending(status)) return "warning";
    if (status === "APPROVED") return "success";
    return "error";
  };

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          bgcolor: "#F5F7FA",
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Approval
        </Typography>

        <Typography color="text.secondary">
          {summary.pending} Pending Approval
        </Typography>

        <Stack
          direction="row"
          spacing={1.2}
          mt={2}
          mb={2.5}
          sx={{
            overflowX: "auto",
            flexWrap: "nowrap",
            alignItems: "center",
            pb: 1,
            px: 0.2,
            "&::-webkit-scrollbar": {
              display: "none",
            },
            scrollbarWidth: "none",
          }}
        >
          <Chip
            label={`All (${summary.total})`}
            clickable
            color={statusFilter === "ALL" ? "success" : "default"}
            variant={statusFilter === "ALL" ? "filled" : "outlined"}
            onClick={() => setStatusFilter("ALL")}
            sx={{ flexShrink: 0, height: 34, fontWeight: 600 }}
          />

          <Chip
            label={`Pending (${summary.pending})`}
            clickable
            color={statusFilter === "PENDING" ? "success" : "default"}
            variant={statusFilter === "PENDING" ? "filled" : "outlined"}
            onClick={() => setStatusFilter("PENDING")}
            sx={{ flexShrink: 0, height: 34, fontWeight: 600 }}
          />

          <Chip
            label={`Approved (${summary.approved})`}
            clickable
            color={statusFilter === "APPROVED" ? "success" : "default"}
            variant={statusFilter === "APPROVED" ? "filled" : "outlined"}
            onClick={() => setStatusFilter("APPROVED")}
            sx={{ flexShrink: 0, height: 34, fontWeight: 600 }}
          />

          <Chip
            label={`Rejected (${summary.rejected})`}
            clickable
            color={statusFilter === "REJECTED" ? "success" : "default"}
            variant={statusFilter === "REJECTED" ? "filled" : "outlined"}
            onClick={() => setStatusFilter("REJECTED")}
            sx={{ flexShrink: 0, height: 34, fontWeight: 600 }}
          />
        </Stack>
      </Box>

      {loading && requests.length === 0 ? (
        <Stack spacing={2} mt={3}>
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardContent>
                <Skeleton width="45%" height={32} />
                <Skeleton width="30%" height={22} />
                <Skeleton width="55%" height={20} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Stack spacing={2} mt={2}>
          {filtered.length === 0 ? (
            <Typography
              textAlign="center"
              color="text.secondary"
              sx={{
                mt: 5,
                height: "40vh",
                display: "grid",
                placeItems: "center",
              }}
            >
              No data available
            </Typography>
          ) : (
            filtered.map((item) => (
              <Card
                key={`${item.request_type || "LEAVE"}-${item.id}`}
                sx={{
                  borderRadius: 1,
                  cursor: "pointer",
                }}
                onClick={() => openDetail(item)}
              >
                <CardContent>
                  <Typography fontWeight={700} fontSize={17}>
                    {item.name || item.employee_name || "-"}
                  </Typography>

                  <Typography color="text.secondary" mt={0.5}>
                    <strong>Request:</strong> {getRequestLabel(item)}
                  </Typography>

                  {item.request_type === "BUSINESS_TRIP" && (
                    <>
                      <Typography color="text.secondary" mt={0.5}>
                        <strong>Trip Number:</strong> {item.trip_number || "-"}
                      </Typography>

                      <Typography color="text.secondary" mt={0.5}>
                        <strong>Destination:</strong> {item.destination || "-"}
                      </Typography>
                    </>
                  )}

                  <Typography color="text.secondary" mt={0.5}>
                    <strong>Date:</strong> {formatDate(item.start_date)}
                    {item.start_date &&
                      item.end_date &&
                      new Date(item.start_date).toDateString() !==
                        new Date(item.end_date).toDateString() &&
                      ` - ${formatDate(item.end_date)}`}
                  </Typography>

                  {item.request_type === "ATTENDANCE_EDIT" && (
                    <>
                      <Typography color="text.secondary" mt={0.5}>
                        <strong>Check-in Time:</strong>{" "}
                        {formatTime(item.old_check_in)} →{" "}
                        {formatTime(item.new_check_in)}
                      </Typography>

                      <Typography color="text.secondary" mt={0.5}>
                        <strong>Check-out Time:</strong>{" "}
                        {formatTime(item.old_check_out)} →{" "}
                        {formatTime(item.new_check_out)}
                      </Typography>
                    </>
                  )}

                  <Chip
                    size="small"
                    label={getStatusLabel(item.status)}
                    color={getStatusColor(item.status)}
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}
    </Box>
  );
}
