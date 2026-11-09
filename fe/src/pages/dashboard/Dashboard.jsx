import { useEffect, useState } from "react";
import { Grid, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/layout/StatCard";
import AttendanceChart from "../../components/layout/AttChart";
import TodaySummary from "../../components/layout/TodaySummary";
import AttendanceTable from "../../components/layout/DataTable";
import attendanceService from "../../services/attService";

// import attendanceChart from "../../data/charts";

import { useAuth } from "../../context/AuthContext";
import dashboardService from "../../services/dashboardService";
import EmployeeOfMonth from "../../components/layout/EmployeeOfMonth";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const [employeeOfMonth, setEmployeeOfMonth] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState({
    totalEmployee: 0,
    present: 0,
    leave: 0,
    pendingLeave: 0,
    late: 0,
    chart: [],
    attendance: [],
  });
  const [chartPeriod, setChartPeriod] = useState(7);
  const [loadingToday, setLoadingToday] = useState(true);
  const { t } = useTranslation();
  useEffect(() => {
    loadToday();
  }, [chartPeriod]);

  useEffect(() => {
    loadEmployeeOfMonth();
  }, []);

  const loadToday = async () => {
    try {
      setLoadingToday(true);

      const result = await dashboardService.getDashboard(chartPeriod);

      setDashboard(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingToday(false);
    }
  };

  const loadEmployeeOfMonth = async () => {
    try {
      setEmployeeLoading(true);

      const result = await attendanceService.getEmployeeOfMonth();

      setEmployeeOfMonth(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setEmployeeLoading(false);
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <>
      <Grid
        container
        columns={{ xs: 4, sm: 8, lg: 10 }}
        spacing={2.5}
        sx={{
          alignItems: "stretch",
          "& > .MuiGrid-root": {
            display: "flex",
            minWidth: 0,
          },
          "& > .MuiGrid-root > *": {
            width: "100%",
          },
        }}
      >
        <Grid size={{ xs: 4, sm: 4, lg: 2 }}>
          <StatCard
            title={t("dashboard.totalEmployees")}
            value={dashboard.totalEmployee}
            subtitle={`Year ${new Date().getFullYear()}`}
            color="#2E7D32"
            onClick={() => navigate("/admin/employees")}
          />
        </Grid>

        <Grid size={{ xs: 4, sm: 4, lg: 2 }}>
          <StatCard
            title={t("dashboard.presentToday")}
            value={dashboard.present}
            subtitle={new Date().toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            color="#EF6C00"
            onClick={() => navigate("/admin/attendance")}
          />
        </Grid>

        <Grid size={{ xs: 4, sm: 4, lg: 2 }}>
          <StatCard
            title={t("dashboard.leave")}
            value={dashboard.leave}
            subtitle={new Date().toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            color="#1565C0"
            onClick={() => navigate("/admin/leave-history")}
          />
        </Grid>
        <Grid size={{ xs: 4, sm: 4, lg: 2 }}>
          <StatCard
            title="Pending Requests"
            value={dashboard.pendingLeave}
            subtitle="Awaiting approval"
            color="#ED6C02"
            blink={true}
            onClick={() => navigate("/admin/leave-history")}
          />
        </Grid>
        <Grid size={{ xs: 4, sm: 4, lg: 2 }}>
          <StatCard
            title={t("dashboard.late")}
            value={dashboard.late}
            subtitle={new Date().toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            color="#6A1B9A"
            blink={true}
            onClick={() => navigate("/admin/attendance")}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, lg: 9 }}>
          <AttendanceChart
            data={dashboard.chart}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
            loading={loadingToday}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 3 }}>
          <TodaySummary data={dashboard} />
        </Grid>
      </Grid>

      <Grid container sx={{ mt: 2 }}>
        <Grid size={12}>
          {/* <AttendanceTable
                        data={dashboard.attendance}
                    /> */}
          <EmployeeOfMonth data={employeeOfMonth} loading={employeeLoading} />
        </Grid>
      </Grid>
    </>
  );
}
