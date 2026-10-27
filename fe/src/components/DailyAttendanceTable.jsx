import { useEffect, useState } from "react";
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
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttendanceLocationMap from "./attendance/AttendanceLocationMap";

// Set VITE_API_URL to the backend origin (or origin + /api) in Vercel.
const configuredApi = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/+$/, "");

const API_ROOT = configuredApi.endsWith("/api")
  ? configuredApi
  : `${configuredApi}/api`;
function formatTimeWIB(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function PhotoPanel({ label, url, available, loading, error, color }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" fontWeight={600} mb={1} color={color}>
        {label}
      </Typography>
      <Box
        sx={{
          height: 220,
          borderRadius: 2,
          border: "1px solid #E5E7EB",
          bgcolor: "#F3F4F6",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {loading && available ? (
          <CircularProgress size={26} />
        ) : url ? (
          <Box
            component="img"
            src={url}
            alt={`Foto ${label}`}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            px={2}
          >
            {available && error
              ? "Foto gagal dimuat"
              : `Foto ${label} tidak tersedia`}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function DailyAttendanceTable({ data = [], loading = false }) {
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [openAttendanceDetail, setOpenAttendanceDetail] = useState(false);
  const [photos, setPhotos] = useState({ checkIn: "", checkOut: "" });
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const closeDetail = () => {
    setOpenAttendanceDetail(false);
    setSelectedAttendance(null);
  };

  useEffect(() => {
    if (!openAttendanceDetail || !selectedAttendance) return;
    const controller = new AbortController();
    let active = true;
    const attendance = selectedAttendance;

    const load = async () => {
      setPhotos({ checkIn: "", checkOut: "" });
      setPhotoError("");
      if (!attendance.photo_path && !attendance.check_out_photo_path) return;
      if (!attendance.attendance_id) {
        setPhotoError(
          "ID absensi tidak tersedia. Periksa query /daily pada backend.",
        );
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setPhotoError("Sesi login tidak ditemukan. Silakan login kembali.");
        return;
      }

      setPhotoLoading(true);
      const fetchPhoto = async (type) => {
        const response = await fetch(
          `${API_ROOT}/attendance/${encodeURIComponent(attendance.attendance_id)}/photo/${type}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        const result = await response.json();
        if (!response.ok || !result.success || !result.data?.url) {
          throw new Error(result.message || `Gagal mengambil foto ${type}`);
        }
        return result.data.url;
      };

      try {
        const [checkIn, checkOut] = await Promise.allSettled([
          attendance.photo_path ? fetchPhoto("check-in") : Promise.resolve(""),
          attendance.check_out_photo_path
            ? fetchPhoto("check-out")
            : Promise.resolve(""),
        ]);
        if (!active) return;
        setPhotos({
          checkIn: checkIn.status === "fulfilled" ? checkIn.value : "",
          checkOut: checkOut.status === "fulfilled" ? checkOut.value : "",
        });
        const errors = [checkIn, checkOut]
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason?.message || "Foto gagal dimuat");
        if (errors.length) setPhotoError(errors.join("; "));
      } finally {
        if (active) setPhotoLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [openAttendanceDetail, selectedAttendance]);

  return (
    <>
      <Card
        elevation={0}
        sx={{ mt: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Data Absensi Hari Ini
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>No.</TableCell>
                  <TableCell>Karyawan</TableCell>
                  <TableCell>Check In</TableCell>
                  <TableCell>Check Out</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Telat</TableCell>
                  <TableCell align="center">Detail</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton width={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={130} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={70} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={70} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={90} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={50} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={30} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Belum ada data absensi.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => (
                    <TableRow
                      key={item.id ?? index}
                      hover
                      sx={{ "& td": { py: 1 } }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Avatar
                            sx={{
                              width: 38,
                              height: 38,
                              fontSize: 16,
                              bgcolor: "#D1D5DB",
                              color: "#374151",
                            }}
                          >
                            {item.name?.charAt(0) || "?"}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} fontSize={14}>
                              {item.name || "-"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.department || "-"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatTimeWIB(item.check_in)}</TableCell>
                      <TableCell>{formatTimeWIB(item.check_out)}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.status || "-"}
                          size="small"
                          color={
                            item.status === "Belum Check In"
                              ? "default"
                              : "success"
                          }
                        />
                      </TableCell>
                      <TableCell>{item.late_minutes ?? 0} menit</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          aria-label={`Detail absensi ${item.name}`}
                          onClick={() => {
                            setSelectedAttendance(item);
                            setOpenAttendanceDetail(true);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={openAttendanceDetail}
        onClose={closeDetail}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detail Absensi</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Karyawan
              </Typography>
              <Typography fontWeight={600}>
                {selectedAttendance?.name || "-"}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
                py: 1,
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary" mb={0.5}>
                  Department
                </Typography>
                <Typography fontWeight={600}>
                  {selectedAttendance?.department || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" mb={0.5}>
                  Check In
                </Typography>
                <Typography fontWeight={600}>
                  {formatTimeWIB(selectedAttendance?.check_in)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" mb={0.5}>
                  Check Out
                </Typography>
                <Typography fontWeight={600}>
                  {formatTimeWIB(selectedAttendance?.check_out)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" mb={0.5}>
                  Status
                </Typography>
                <Chip
                  label={selectedAttendance?.status || "-"}
                  size="small"
                  color={
                    selectedAttendance?.status === "Pulang"
                      ? "success"
                      : "default"
                  }
                />
              </Box>
            </Box>
            <Divider />
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Lokasi Absensi
              </Typography>
              {selectedAttendance && (
                <AttendanceLocationMap
                  checkInLat={selectedAttendance.check_in_lat}
                  checkInLng={selectedAttendance.check_in_lng}
                  checkOutLat={selectedAttendance.check_out_lat}
                  checkOutLng={selectedAttendance.check_out_lng}
                />
              )}
            </Box>
            <Divider />
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Foto Absensi
              </Typography>
              {photoError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {photoError}
                </Alert>
              )}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <PhotoPanel
                  label="Check In"
                  color="success.main"
                  url={photos.checkIn}
                  available={!!selectedAttendance?.photo_path}
                  loading={photoLoading}
                  error={photoError}
                />
                <PhotoPanel
                  label="Check Out"
                  color="error.main"
                  url={photos.checkOut}
                  available={!!selectedAttendance?.check_out_photo_path}
                  loading={photoLoading}
                  error={photoError}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail}>Tutup</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
