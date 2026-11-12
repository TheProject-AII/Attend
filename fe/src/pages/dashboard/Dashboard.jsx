import { useCallback, useEffect, useState } from "react";

import {
  Box,
  Grid,
  Typography,
  Paper,
  Chip,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
} from "@mui/material";

import {
  CampaignRounded,
  AccessTimeRounded,
  RefreshRounded,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

import StatCard from "../../components/layout/StatCard";
import dashboardService from "../../services/dashboardService";

// =====================================================
// ATTENDANCE LINE CHART
// =====================================================

function AttendanceLineChart({ data = [], period, onPeriodChange, loading }) {
  const chartData = Array.isArray(data) ? data : [];

  const getValue = (item) =>
    Number(
      item.present ??
        item.total_present ??
        item.attendance ??
        item.count ??
        item.total ??
        0,
    );

  const getLabel = (item, index) =>
    item.label ?? item.day ?? item.date ?? item.month ?? `Data ${index + 1}`;

  const values = chartData.map(getValue);
  const maxValue = Math.max(...values, 5);

  const width = 600;
  const height = 230;
  const left = 42;
  const right = 15;
  const top = 20;
  const bottom = 35;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const points = values.map((value, index) => {
    const x =
      chartData.length <= 1
        ? left + chartWidth / 2
        : left + (index / (chartData.length - 1)) * chartWidth;

    const y = top + chartHeight - (value / maxValue) * chartHeight;

    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = points.length
    ? `${linePath} L ${
        points[points.length - 1].x
      } ${top + chartHeight} L ${points[0].x} ${top + chartHeight} Z`
    : "";

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid #E5E7EB",
        borderRadius: 1,
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>
            Attendance Trends
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Weekly and monthly employee attendance
          </Typography>
        </Box>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={period}
          onChange={(_, value) => {
            if (value) onPeriodChange(value);
          }}
        >
          <ToggleButton value={7}>Weekly</ToggleButton>
          <ToggleButton value={30}>Monthly</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {loading ? (
        <Skeleton variant="rounded" height={220} />
      ) : chartData.length > 0 ? (
        <Box sx={{ width: "100%", overflow: "hidden" }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            role="img"
            aria-label="Attendance line chart"
          >
            {[0, 1, 2, 3, 4].map((step) => {
              const y = top + (chartHeight / 4) * step;

              return (
                <g key={step}>
                  <line
                    x1={left}
                    y1={y}
                    x2={width - right}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeDasharray="4 4"
                  />

                  <text
                    x={left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#94A3B8"
                  >
                    {Math.round((maxValue * (4 - step)) / 4)}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill="#0F766E" opacity="0.10" />

            <path
              d={linePath}
              fill="none"
              stroke="#0F766E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#FFFFFF"
                  stroke="#0F766E"
                  strokeWidth="3"
                />

                <text
                  x={point.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748B"
                >
                  {getLabel(chartData[index], index)}
                </text>
              </g>
            ))}
          </svg>
        </Box>
      ) : (
        <Box
          sx={{
            height: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color="text.secondary">
            No attendance data available.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

// =====================================================
// AUTOMATIC ANNOUNCEMENT
// =====================================================

function Announcement({ announcements = [] }) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid #E5E7EB",
        borderRadius: 1,
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>
            Announcement
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Automatic HR notifications
          </Typography>
        </Box>

        <CampaignRounded sx={{ color: "#0F766E", fontSize: 26 }} />
      </Stack>

      <Stack sx={{ mt: 1.5 }} spacing={2}>
        {announcements.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography fontWeight={600} color="text.secondary" fontSize={14}>
              No announcements
            </Typography>

            <Typography variant="caption" color="text.secondary">
              There are no employee contracts set to expire within the next 14
              days.
            </Typography>
          </Box>
        ) : (
          announcements.map((item, index) => {
            const color =
              item.severity === "error"
                ? "#DC2626"
                : item.severity === "warning"
                  ? "#D97706"
                  : "#2563EB";

            return (
              <Box key={item.id}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: 1,
                      bgcolor: `${color}15`,
                      color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AccessTimeRounded />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      flexWrap="wrap"
                      gap={1}
                    >
                      <Typography sx={{ fontWeight: 800, fontSize: 12 }}>
                        {item.title} — {item.name}
                      </Typography>

                      <Chip
                        label={`${item.category} · ${item.remainingDays} hari lagi`}
                        size="small"
                        sx={{
                          ml: 1,
                          height: 22,
                          fontSize: 10,
                          bgcolor: `${color}15`,
                          color,
                        }}
                      />
                    </Stack>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      mt={0.5}
                    >
                      End On : {item.date} · {item.employeeType}
                    </Typography>

                    <Typography
                      sx={{ fontSize: 11 }}
                      color="text.secondary"
                      mt={0.7}
                      lineHeight={1.6}
                    >
                      {item.description}
                    </Typography>
                  </Box>
                </Stack>

                {index !== announcements.length - 1 && (
                  <Divider sx={{ mt: 2 }} />
                )}
              </Box>
            );
          })
        )}
      </Stack>
    </Paper>
  );
}

// =====================================================
// MAIN DASHBOARD
// =====================================================

export default function Dashboard() {
  const { loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [dashboard, setDashboard] = useState({
    totalEmployee: 0,
    present: 0,
    notCheckIn: 0,
    leave: 0,
    pendingLeave: 0,
    late: 0,
    chart: [],
    attendance: [],
    announcements: [],
  });

  const [chartPeriod, setChartPeriod] = useState(7);
  const [loadingToday, setLoadingToday] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadToday = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoadingToday(true);
        }

        const result = await dashboardService.getDashboard(chartPeriod);

        if (result?.data) {
          setDashboard((prev) => ({
            ...prev,
            ...result.data,
          }));

          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error("Dashboard loading error:", err);
      } finally {
        setLoadingToday(false);
      }
    },
    [chartPeriod],
  );

  useEffect(() => {
    loadToday(true);

    const interval = setInterval(() => {
      loadToday(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadToday]);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  const today = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      {/* TOP STATISTICS - fixed responsive CSS grid */}
      <Box
        sx={{
          display: "grid",
          width: "100%",
          minWidth: 0,
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(6, minmax(0, 1fr))",
          },
          gap: { xs: 1, sm: 1.25, lg: 1.5 },
          alignItems: "stretch",
          "& > *": { minWidth: 0 },
        }}
      >
        <StatCard
          title={t("dashboard.totalEmployees")}
          value={dashboard.totalEmployee}
          subtitle={`Year ${new Date().getFullYear()}`}
          color="#2E7D32"
          onClick={() => navigate("/admin/employees")}
        />

        <StatCard
          title={t("dashboard.presentToday")}
          value={dashboard.present}
          subtitle={today}
          color="#EF6C00"
          onClick={() => navigate("/admin/attendance")}
        />

        <StatCard
          title="Not Checked In"
          value={dashboard.notCheckIn ?? 0}
          subtitle={today}
          color="#D97706"
          blink={true}
          onClick={() => navigate("/admin/attendance")}
        />

        <StatCard
          title={t("dashboard.leave")}
          value={dashboard.leave}
          subtitle={today}
          color="#1565C0"
          onClick={() => navigate("/admin/leave-history")}
        />

        <StatCard
          title="Pending Requests"
          value={dashboard.pendingLeave}
          subtitle="Awaiting approval"
          color="#ED6C02"
          blink={true}
          onClick={() => navigate("/admin/leave-history")}
        />

        <StatCard
          title={t("dashboard.late")}
          value={dashboard.late}
          subtitle={today}
          color="#6A1B9A"
          blink={true}
          onClick={() => navigate("/admin/attendance")}
        />
      </Box>

      {/* ANNOUNCEMENT + ATTENDANCE CHART */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Announcement announcements={dashboard.announcements} />
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <AttendanceLineChart
            data={dashboard.chart}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
            loading={loadingToday}
          />
        </Grid>
      </Grid>

      {/* LAST UPDATE */}
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        spacing={1}
        mt={2}
      >
        <RefreshRounded sx={{ fontSize: 15, color: "text.secondary" }} />

        <Typography variant="caption" color="text.secondary">
          {lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleTimeString("id-ID")}`
            : "Updating dashboard..."}
        </Typography>
      </Stack>
    </Box>
  );
}
