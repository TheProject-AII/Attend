import React, { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Pagination,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

const rawApiUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

const API_BASE = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;

const formatMinutes = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
};

const formatDate = (value) => {
  if (!value) return "-";

  const parts = String(value).slice(0, 10).split("-");

  if (parts.length !== 3) return String(value);

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatTime = (value) => {
  if (!value) return "-";

  const match = String(value).match(/[T ](\d{2}:\d{2})/);

  return match?.[1] || "-";
};

const getToken = () =>
  localStorage.getItem("token") || localStorage.getItem("accessToken") || "";

async function apiGet(path, signal) {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    signal,
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }

  return result;
}

function MiniStat({ label, value, icon, color }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        minWidth: 0,
        height: "100%",
      }}
    >
      <Stack spacing={1.2}>
        <Box sx={{ color }}>{icon}</Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.3 }}
        >
          {label}
        </Typography>

        <Typography
          fontSize={{ xs: 17, sm: 20 }}
          fontWeight={800}
          sx={{ overflowWrap: "anywhere" }}
        >
          {formatMinutes(value)}
        </Typography>
      </Stack>
    </Paper>
  );
}

function HistoryCard({ item }) {
  const late = Number(item.late_minutes) || 0;
  const paid = Number(item.paid_today) || 0;

  const balance = Number(item.closing_balance ?? 0);
  const hasDebt = balance > 0;

  const statusLabel = hasDebt
    ? "Outstanding"
    : late > 0 || paid > 0
      ? "Paid in Full"
      : "On Time";

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "background.paper",
        borderColor: "divider",
        boxShadow: "none",
      }}
    >
      <Stack spacing={1.5}>
        {/* DATE & STATUS */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ minWidth: 0 }}
          >
            <CalendarMonthRoundedIcon
              sx={{
                fontSize: 17,
                color: "text.secondary",
              }}
            />

            <Typography fontSize={13} fontWeight={700} noWrap>
              {formatDate(item.attendance_date)}
            </Typography>
          </Stack>

          <Chip
            label={statusLabel}
            size="small"
            color={
              hasDebt ? "warning" : late > 0 || paid > 0 ? "success" : "default"
            }
            variant="outlined"
            sx={{
              height: 23,
              fontSize: 10,
              fontWeight: 600,
              flexShrink: 0,
            }}
          />
        </Stack>

        {/* CHECK-IN AND CHECK-OUT TIMES */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <ScheduleRoundedIcon
              sx={{
                fontSize: 16,
                color: "text.secondary",
              }}
            />

            <Typography fontSize={12} color="text.secondary">
              {formatTime(item.check_in)}
              {" – "}
              {formatTime(item.check_out)}
            </Typography>
          </Stack>

          <Typography fontSize={10} color="text.secondary">
            {item.attendance_type || "OFFICE"}
          </Typography>
        </Stack>

        <Divider />

        {/* RINGKASAN KOMPENSASI */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          <Box>
            <Typography fontSize={10} color="text.secondary" mb={0.5}>
              Late
            </Typography>

            <Typography fontSize={13} fontWeight={700}>
              {late} mnt
            </Typography>
          </Box>

          <Box>
            <Typography fontSize={10} color="text.secondary" mb={0.5}>
              Compensated
            </Typography>

            <Typography fontSize={13} fontWeight={700} color="success.main">
              {paid} mnt
            </Typography>
          </Box>

          <Box>
            <Typography fontSize={10} color="text.secondary">
              Closing Balance
            </Typography>

            <Typography
              fontSize={13}
              fontWeight={700}
              color={hasDebt ? "warning.main" : "text.primary"}
            >
              {balance} mnt
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function MyLateCompensation() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        const [summaryResult, historyResult] = await Promise.all([
          apiGet("/late-compensation/my-summary", signal),
          apiGet(`/late-compensation/my-history?${params}`, signal),
        ]);

        if (signal.aborted) return;

        setSummary(summaryResult.data || {});
        setHistory(Array.isArray(historyResult.data) ? historyResult.data : []);
        setTotal(Number(historyResult.pagination?.total) || 0);
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
    [page, limit],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadData(controller.signal);

    return () => controller.abort();
  }, [loadData, refreshKey]);

  const totalLate = Number(summary?.total_late_minutes || 0);

  const totalPaid = Number(summary?.total_paid_minutes || 0);

  const outstanding = Number(summary?.outstanding_minutes || 0);

  const progress =
    totalLate > 0
      ? Math.min(100, Math.round((totalPaid / totalLate) * 100))
      : 0;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        px: { xs: 1.5, sm: 3 },
        pt: 2,
        pb: 12,
        bgcolor: "#F8FAFC",
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography fontSize={21} fontWeight={800} color="#1E293B">
            Time Compensation
          </Typography>

          <Typography fontSize={12} color="text.secondary" mt={0.5}>
            Track late arrivals and make-up work time.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {loading && !summary ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                bgcolor: "#ECFDF5",
                border: "1px solid #BBF7D0",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography fontSize={12} fontWeight={600} color="#166534">
                      Sisa waktu yang perlu diganti
                    </Typography>

                    <ScheduleRoundedIcon sx={{ color: "#16A34A" }} />
                  </Stack>

                  <Typography fontSize={32} fontWeight={800} color="#14532D">
                    {formatMinutes(outstanding)}
                  </Typography>

                  <Divider />

                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontSize={12}>Compensation Progress</Typography>

                    <Typography fontSize={12} fontWeight={800}>
                      {progress}%
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 9,
                      borderRadius: 3,
                      bgcolor: "#BBF7D0",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "#16A34A",
                        borderRadius: 3,
                      },
                    }}
                  />

                  <Typography fontSize={12} color="text.secondary">
                    {totalLate === 0
                      ? "No late arrivals have been recorded."
                      : outstanding === 0
                        ? "All late time has been made up."
                        : `${formatMinutes(totalPaid)} dari ${formatMinutes(
                            totalLate,
                          )} has been made up.`}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 1.5,
              }}
            >
              <MiniStat
                label="Total Late Time"
                value={totalLate}
                icon={<AccessTimeRoundedIcon />}
                color="#EA580C"
              />

              <MiniStat
                label="Time Compensated"
                value={totalPaid}
                icon={<CheckCircleRoundedIcon />}
                color="#16A34A"
              />
            </Box>

            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={1.5}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <HistoryRoundedIcon sx={{ color: "#16A34A" }} />

                  <Typography fontSize={16} fontWeight={800}>
                    Compensation History
                  </Typography>
                </Stack>

                <IconButton
                  size="small"
                  disabled={loading}
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                  aria-label="Refresh"
                >
                  <RefreshRoundedIcon />
                </IconButton>
              </Stack>

              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={28} />
                </Box>
              ) : history.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    textAlign: "center",
                  }}
                >
                  <HistoryRoundedIcon
                    sx={{
                      fontSize: 36,
                      color: "#94A3B8",
                      mb: 1,
                    }}
                  />

                  <Typography fontSize={13} color="text.secondary">
                    No compensation history yet.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={1.5}>
                  {history.map((item) => (
                    <HistoryCard key={item.attendance_id} item={item} />
                  ))}
                </Stack>
              )}
            </Box>

            {totalPages > 1 && (
              <Stack alignItems="center" pt={1}>
                <Pagination
                  count={totalPages}
                  page={page}
                  size="small"
                  color="success"
                  siblingCount={0}
                  boundaryCount={1}
                  onChange={(_, value) => {
                    setPage(value);
                  }}
                />
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}
