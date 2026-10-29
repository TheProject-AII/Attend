import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import WorkOutlineIcon from "@mui/icons-material/Work";
import JobDescriptionForm from "../../components/JobDescriptionForm";
import api from "../../services/api";
// Pertahankan import API_BASE_URL dari lokasi aslinya di project lo.
// Contoh:
// import { API_BASE_URL } from "../config/api";

const frequencies = [
  { value: "daily", label: "Daily", apiValue: "Daily" },
  { value: "weekly", label: "Weekly", apiValue: "Weekly" },
  { value: "monthly", label: "Monthly", apiValue: "Monthly" },
  { value: "yearly", label: "Yearly", apiValue: "Yearly" },
  { value: "adhoc", label: "Ad-hoc", apiValue: "Ad-hoc" },
];

const normalizeFrequency = (value = "") => {
  const normalized = value.toLowerCase().replace(/[-\s]/g, "");

  return normalized === "adhoc" ? "adhoc" : normalized;
};

export default function EmployeeDetail({ open, employee, onClose }) {
  if (!open || !employee) {
    return null;
  }
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const fetchJobs = async () => {
    if (!employee?.nip) return;

    setLoadingJobs(true);

    try {
      const response = await api.get(
        `/auth/employees/${encodeURIComponent(employee.nip)}/job-descriptions`,
      );

      setJobs(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error(
        "Gagal mengambil Job Description:",
        error.response?.data || error.message,
      );

      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (open && employee?.nip) {
      fetchJobs();
    }
  }, [open, employee?.nip]);

  const handleCreateJob = async (payload) => {
    if (!employee?.nip) {
      throw new Error("NIP karyawan tidak ditemukan.");
    }

    const frequencyMap = {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
      adhoc: "Ad-hoc",
    };

    const frequency =
      frequencyMap[String(payload.frequency).toLowerCase()] ||
      payload.frequency;

    const requestBody = {
      frequency,
      task_number: payload.task_number?.trim() || null,
      title: payload.title?.trim(),
      description: payload.description?.trim() || null,
      minutes:
        payload.minutes === "" || payload.minutes == null
          ? null
          : Number(payload.minutes),
      hours:
        payload.hours === "" || payload.hours == null
          ? null
          : Number(payload.hours),
    };

    try {
      const response = await api.post(
        `/auth/employees/${encodeURIComponent(employee.nip)}/job-descriptions`,
        requestBody,
      );

      const newJob = response.data?.data;

      if (newJob) {
        setJobs((previousJobs) => [...previousJobs, newJob]);
      } else {
        await fetchJobs();
      }

      setFrequency(String(frequency).toLowerCase().replace("-", ""));
      setJobModalOpen(false);
    } catch (error) {
      console.error(
        "Gagal menyimpan Job Description:",
        error.response?.data || error.message,
      );

      throw new Error(
        error.response?.data?.message || "Job Description gagal disimpan.",
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };
  const filteredJobs = jobs.filter(
    (job) => normalizeFrequency(job.frequency) === frequency,
  );

  const workingDays = {
    weekly: 5,
    monthly: 22,
    yearly: 240,
  };

  const targetHours = 8;

  const getTotalMinutes = (frequencyKey) =>
    jobs
      .filter((job) => normalizeFrequency(job.frequency) === frequencyKey)
      .reduce((total, job) => total + (Number(job.minutes) || 0), 0);

  const averageDailyRows = [
    {
      key: "daily",
      description: "Daily",
      minutes: getTotalMinutes("daily"),
      divisor: 1,
    },
    {
      key: "weekly",
      description: "Weekly",
      minutes: getTotalMinutes("weekly"),
      divisor: workingDays.weekly,
    },
    {
      key: "monthly",
      description: "Monthly",
      minutes: getTotalMinutes("monthly"),
      divisor: workingDays.monthly,
    },
    {
      key: "yearly",
      description: "Yearly",
      minutes: getTotalMinutes("yearly"),
      divisor: workingDays.yearly,
    },
    {
      key: "adhoc",
      description: "Ad-hoc",
      minutes: getTotalMinutes("adhoc"),
      divisor: workingDays.monthly,
    },
  ].map((item) => ({
    ...item,
    dailyMinutes: item.minutes / item.divisor,
    dailyHours: item.minutes / item.divisor / 60,
  }));

  const averageDailyMinutes = averageDailyRows.reduce(
    (total, item) => total + item.dailyMinutes,
    0,
  );

  const averageDailyHours = averageDailyMinutes / 60;
  const differenceFromTarget = averageDailyHours - targetHours;
  const percentageOfTarget = (averageDailyHours / targetHours) * 100;

  const formatDecimal = (value, digits = 2) =>
    value.toLocaleString("id-ID", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  if (!open || !employee) {
    return null;
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "min(1400px, calc(100% - 48px))",
            maxHeight: "90vh",
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 2,
          }}
        >
          <Box>
            <Typography fontWeight={700} fontSize={20}>
              Employee Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete employee information
            </Typography>
          </Box>

          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3} alignItems="flex-start">
            {/* KOLOM KIRI: INFORMASI KARYAWAN */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Paper
                variant="outlined"
                sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 3 }}
                >
                  <Avatar
                    src={employee.photoUrl || undefined}
                    alt={employee.name}
                    sx={{ width: 72, height: 72, fontSize: 28 }}
                  >
                    {employee.name?.charAt(0)?.toUpperCase()}
                  </Avatar>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                      }}
                      fontSize={19}
                    >
                      {employee.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                      }}
                      variant="body2"
                    >
                      {employee.company_name || "-"}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mt={0.5}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {employee.position || "-"}
                      </Typography>
                      <Chip
                        label={employee.status ? "Active" : "Inactive"}
                        color={employee.status ? "success" : "default"}
                        size="small"
                      />
                    </Stack>
                  </Box>
                </Stack>

                <Divider sx={{ mb: 2.5 }} />

                <Typography fontWeight={700} mb={2}>
                  Personal Information
                </Typography>

                <Grid container spacing={2.5} mb={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem label="NIK" value={employee.nik} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem label="Full Name" value={employee.name} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem label="Email" value={employee.company_email} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem label="Phone Number" value={employee.phone} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <DetailItem label="Address" value={employee.address} />
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 2.5 }} />

                <Typography fontWeight={700} mb={2}>
                  Dokumen
                </Typography>

                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    National ID Card (KTP)
                  </Typography>

                  {employee.ktp ? (
                    <Box
                      component="img"
                      src={`${API_BASE_URL}${employee.ktp}`}
                      alt="KTP"
                      sx={{
                        width: "100%",
                        maxWidth: 500,
                        maxHeight: 280,
                        objectFit: "contain",
                        borderRadius: 2,
                        border: "1px solid #E5E7EB",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        window.open(`${API_BASE_URL}${employee.ktp}`, "_blank")
                      }
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      National ID card is unavailable
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                <Typography fontWeight={700} mb={2}>
                  Employment Information
                </Typography>

                <Grid container spacing={2.5} mb={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem
                      label="Department"
                      value={employee.department}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem label="Position" value={employee.position} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem
                      label="Start Date"
                      value={formatDate(employee.join_date)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem
                      label="Employee Type"
                      value={
                        employee.employee_type === "KONTRAK_INTERN"
                          ? "Intern"
                          : employee.employee_type?.includes("KONTRAK")
                            ? "Contract"
                            : "Permanent"
                      }
                    />
                  </Grid>
                </Grid>

                {employee.employee_type?.includes("KONTRAK") && (
                  <>
                    <Divider sx={{ mb: 2.5 }} />
                    <Typography fontWeight={700} mb={2}>
                      Contract Term
                    </Typography>
                    <Grid container spacing={2.5}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                          label="Contract Start Date"
                          value={formatDate(employee.join_date)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                          label="Contract End Date"
                          value={formatDate(employee.contract_end_date)}
                        />
                      </Grid>
                    </Grid>
                  </>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, lg: 8 }}>
              <Grid container spacing={2} alignItems="stretch">
                {/* CARD JOB DESCRIPTION */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 2, md: 2.5 },
                      borderRadius: 2,
                      height: { xs: "auto", lg: "calc(90vh - 180px)" },
                      minHeight: 400,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        mb: 1,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <WorkOutlineIcon color="primary" />
                        <Typography
                          variant="h6"
                          component="h2"
                          sx={{
                            fontWeight: 700,
                            color: "text.primary",
                          }}
                        >
                          Job Description
                        </Typography>
                      </Stack>

                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setJobModalOpen(true)}
                        sx={{
                          ml: "auto",
                          flexShrink: 0,
                          textTransform: "none",
                        }}
                      >
                        Add Task
                      </Button>
                    </Box>

                    <Typography variant="body2" color="text.secondary" mb={2}>
                      List of employee responsibilities and work schedules.
                    </Typography>

                    <Tabs
                      value={frequency}
                      onChange={(_, value) => setFrequency(value)}
                      variant="fullWidth"
                      sx={{ mb: 2 }}
                    >
                      {frequencies.map((item) => (
                        <Tab
                          key={item.value}
                          value={item.value}
                          label={item.label}
                          sx={{ minWidth: 0, px: 0.5, fontSize: 12 }}
                        />
                      ))}
                    </Tabs>
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: { xs: "visible", lg: "auto" },
                        pr: { xs: 0, lg: 1 },
                        "&::-webkit-scrollbar": {
                          width: 6,
                        },
                        "&::-webkit-scrollbar-thumb": {
                          backgroundColor: "rgba(128,128,128,0.45)",
                          borderRadius: 3,
                        },
                      }}
                    >
                      {loadingJobs ? (
                        <Typography color="text.secondary">
                          Loading jobs...
                        </Typography>
                      ) : filteredJobs.length === 0 ? (
                        <Box
                          sx={{
                            py: 7,
                            textAlign: "center",
                            color: "text.secondary",
                          }}
                        >
                          <WorkOutlineIcon
                            sx={{ fontSize: 40, opacity: 0.5 }}
                          />
                          <Typography mt={1} fontWeight={600}>
                            No jobs available
                          </Typography>
                          <Typography variant="body2">
                            Add a job description for the category {frequency}.
                          </Typography>
                        </Box>
                      ) : (
                        <Stack spacing={1.5}>
                          {filteredJobs.map((job) => (
                            <Paper
                              key={job.id}
                              variant="outlined"
                              sx={{ p: 2, borderRadius: 2 }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={1}
                              >
                                <Typography fontWeight={700}>
                                  {job.task_number
                                    ? `${job.task_number} · `
                                    : ""}
                                  {job.title}
                                </Typography>

                                {job.minutes != null && (
                                  <Chip
                                    size="small"
                                    label={`${job.minutes} minutes`}
                                    variant="outlined"
                                  />
                                )}
                              </Stack>

                              {job.description && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  mt={0.5}
                                  sx={{
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {job.description}
                                </Typography>
                              )}

                              {job.hours != null && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                  mt={1}
                                >
                                  Duration: {job.hours} hours
                                </Typography>
                              )}
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* CARD AVERAGE DAILY */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 2, md: 2.5 },
                      borderRadius: 2,
                      height: { xs: "auto", lg: "calc(90vh - 180px)" },
                      minHeight: 400,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <Typography
                      variant="h6"
                      component="h2"
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                      }}
                    >
                      Average Daily
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Daily Workload Summary
                    </Typography>
                    <Divider />

                    <Box
                      sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        bgcolor: "action.hover",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Total Workload
                      </Typography>

                      <Typography variant="h4" fontWeight={700}>
                        {formatDecimal(averageDailyHours)} hours
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        out of a target {targetHours} hours/day
                      </Typography>

                      <Box
                        sx={{
                          height: 8,
                          mt: 1.5,
                          borderRadius: 10,
                          bgcolor: "action.disabledBackground",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${Math.min(100, Math.max(0, percentageOfTarget))}%`,
                            bgcolor: "success.main",
                            borderRadius: 10,
                          }}
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        {formatDecimal(percentageOfTarget, 1)}% of the target
                      </Typography>
                    </Box>

                    <TableContainer sx={{ flex: 1, overflowY: "auto" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ px: 0.5 }}>Category</TableCell>
                            <TableCell align="right" sx={{ px: 0.5 }}>
                              Minutes
                            </TableCell>
                            <TableCell align="right" sx={{ px: 0.5 }}>
                              Hours
                            </TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {averageDailyRows.map((item) => (
                            <TableRow key={item.key}>
                              <TableCell sx={{ px: 0.5 }}>
                                {item.description}
                              </TableCell>
                              <TableCell align="right" sx={{ px: 0.5 }}>
                                {formatDecimal(item.dailyMinutes, 1)}
                              </TableCell>
                              <TableCell align="right" sx={{ px: 0.5 }}>
                                {formatDecimal(item.dailyHours)}
                              </TableCell>
                            </TableRow>
                          ))}

                          <TableRow
                            sx={{
                              "& td": {
                                fontWeight: 700,
                                borderTop: 2,
                                px: 0.5,
                              },
                            }}
                          >
                            <TableCell>Total</TableCell>
                            <TableCell align="right">
                              {formatDecimal(averageDailyMinutes, 1)}
                            </TableCell>
                            <TableCell align="right">
                              {formatDecimal(averageDailyHours)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Divider sx={{ my: 1.5 }} />

                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Difference from target
                      </Typography>

                      <Typography
                        sx={{
                          fontWeight: 700,
                          color:
                            differenceFromTarget < 0
                              ? "error.main"
                              : "success.main",
                        }}
                      >
                        {differenceFromTarget > 0 ? "+" : ""}
                        {formatDecimal(differenceFromTarget)} hours
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary" mt={1}>
                      Calculation basis: 5 days/week, 22 days/month, 240
                      days/year.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>

            {/* KOLOM KANAN: JOB DESCRIPTION
            <Grid size={{ xs: 12, lg: 8 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, md: 3 },
                  borderRadius: 2,
                  height: { xs: "auto", lg: "calc(90vh - 180px)" },
                  minHeight: { xs: 400, lg: 400 },
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              ></Paper>
            </Grid> */}
          </Grid>
        </DialogContent>
      </Dialog>

      {/* MODAL KEDUA: TAMBAH JOB DESCRIPTION */}
      <JobDescriptionForm
        open={jobModalOpen}
        onClose={() => setJobModalOpen(false)}
        employeeId={employee.nip}
        onSubmit={handleCreateJob}
      />
    </>
  );
}

function DetailItem({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        fontWeight={600}
        mt={0.3}
        sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}
      >
        {value || "-"}
      </Typography>
    </Box>
  );
}
