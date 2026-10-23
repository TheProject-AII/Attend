import {
    Card,
    CardContent,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Stack,
    Avatar,
    Box,
    Chip,
    IconButton, Skeleton,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
    Divider
} from "@mui/material";
import { useState } from 'react';

import VisibilityIcon from "@mui/icons-material/Visibility";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AttendanceLocationMap from "./attendance/AttendanceLocationMap";

const API_BASE_URL = "http://localhost:3000"; // Sesuaikan port backend Node.js

const getAttendancePhotoUrl = (photoPath) => {
    if (!photoPath) return "";

    const normalized = String(photoPath).replace(/\\/g, "/");
    const index = normalized.indexOf("/uploads/");

    if (index === -1) return "";

    return `${API_BASE_URL}${normalized.slice(index)}`;
};

export default function DailyAttendanceTable({

    data = [], loading = false


}) {
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [openAttendanceDetail, setOpenAttendanceDetail] = useState(false);
    const formatTimeWIB = (dateString) => {
        if (!dateString) return "-";

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) return "-";

        return new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }).format(date);
    };

    return (
        <>
            <Card
                elevation={0}
                sx={{
                    mt: 2,
                    borderRadius: 3,
                    border: "1px solid #E5E7EB"
                }}
            >

                <CardContent>

                    <Typography
                        variant="h6"
                        fontWeight={700}
                        mb={2}
                    >
                        Data Absensi Hari Ini
                    </Typography>

                    <Table >

                        <TableHead>

                            <TableRow hover
                                sx={{
                                    "& td": {
                                        py: 1
                                    }
                                }}>
                                <TableCell>No.</TableCell>

                                <TableCell>Karyawan</TableCell>

                                <TableCell>Check In</TableCell>

                                <TableCell>Check Out</TableCell>

                                <TableCell>Status</TableCell>

                                <TableCell>Telat</TableCell>


                                <TableCell align="center">
                                    Detail
                                </TableCell>

                            </TableRow>

                        </TableHead>

                        <TableBody>

                            {loading ? (

                                [...Array(6)].map((_, index) => (

                                    <TableRow key={index}>
                                        <TableCell>
                                            <Skeleton width={20} />
                                        </TableCell>

                                        <TableCell>
                                            <Skeleton variant="circular" width={38} height={38} />
                                        </TableCell>

                                        <TableCell>
                                            <Skeleton width={70} />
                                        </TableCell>

                                        <TableCell>
                                            <Skeleton width={70} />
                                        </TableCell>

                                        <TableCell>
                                            <Skeleton width={100} />
                                        </TableCell>

                                        <TableCell>
                                            <Skeleton width={50} />
                                        </TableCell>


                                        <TableCell align="center">
                                            <Skeleton width={30} />
                                        </TableCell>

                                    </TableRow>

                                ))

                            ) : data.length === 0 ? (

                                <TableRow hover
                                    sx={{
                                        "& td": {
                                            py: 1
                                        }
                                    }}>

                                    <TableCell
                                        colSpan={8}
                                        align="center"
                                    >
                                        Belum ada data absensi.
                                    </TableCell>

                                </TableRow>

                            ) : (

                                data.map((item, index) => (

                                    <TableRow
                                        key={item.id}
                                        hover
                                        sx={{
                                            "& td": {
                                                py: 1
                                            }
                                        }}
                                    >

                                        {/* Karyawan */}
                                        <TableCell>
                                            {index + 1}
                                        </TableCell>

                                        <TableCell>

                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5
                                                }}
                                            >

                                                <Avatar
                                                    sx={{
                                                        width: 38,
                                                        height: 38,
                                                        fontSize: 16,
                                                        bgcolor: "#D1D5DB",
                                                        color: "#374151"
                                                    }}
                                                >
                                                    {item.name.charAt(0)}
                                                </Avatar>

                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1
                                                    }}
                                                >

                                                    <Typography
                                                        fontWeight={600}
                                                        fontSize={14}
                                                    >
                                                        {item.name}
                                                    </Typography>

                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{
                                                            bgcolor: "#F3F4F6",
                                                            px: 1,
                                                            py: .2,
                                                            borderRadius: 10
                                                        }}
                                                    >
                                                        {item.department}
                                                    </Typography>

                                                </Box>

                                            </Box>

                                        </TableCell>

                                        {/* Check In */}

                                        <TableCell>

                                            {item.check_in
                                                ? formatTimeWIB(item.check_in)
                                                : "-"}

                                        </TableCell>

                                        {/* Check Out */}

                                        <TableCell>

                                            {item.check_out
                                                ? formatTimeWIB(item.check_out)
                                                : "-"}

                                        </TableCell>

                                        {/* Status */}

                                        <TableCell>

                                            <Chip
                                                label={item.status}
                                                size="small"
                                                color={
                                                    item.status === "Belum Check In"
                                                        ? "default"
                                                        : "success"
                                                }
                                            />

                                        </TableCell>

                                        {/* Telat */}

                                        <TableCell>

                                            {item.late_minutes} menit

                                        </TableCell>



                                        {/* Detail */}

                                        <TableCell align="center">

                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => {
                                                    console.log("ATTENDANCE DETAIL:", item);
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

                </CardContent>

            </Card>
            <Dialog
                open={openAttendanceDetail}
                onClose={() => {
                    setOpenAttendanceDetail(false);
                    setSelectedAttendance(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Detail Absensi
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2}>

                        {/* Karyawan */}
                        <Box>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Karyawan
                            </Typography>

                            <Typography fontWeight={600}>
                                {selectedAttendance?.name || "-"}
                            </Typography>
                        </Box>


                        {/* Informasi Absensi */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "repeat(2, minmax(0, 1fr))",
                                    sm: "repeat(4, minmax(0, 1fr))"
                                },
                                gap: 2,
                                py: 1
                            }}
                        >
                            {/* Department */}
                            <Box>
                                <Typography variant="body2" color="text.secondary" mb={0.5}>
                                    Department
                                </Typography>
                                <Typography fontWeight={600}>
                                    {selectedAttendance?.department || "-"}
                                </Typography>
                            </Box>

                            {/* Check In */}
                            <Box>
                                <Typography variant="body2" color="text.secondary" mb={0.5}>
                                    Check In
                                </Typography>
                                <Typography fontWeight={600}>
                                    {selectedAttendance?.check_in
                                        ? selectedAttendance.check_in.substring(11, 16)
                                        : "-"}
                                </Typography>
                            </Box>

                            {/* Check Out */}
                            <Box>
                                <Typography variant="body2" color="text.secondary" mb={0.5}>
                                    Check Out
                                </Typography>
                                <Typography fontWeight={600}>
                                    {selectedAttendance?.check_out
                                        ? selectedAttendance.check_out.substring(11, 16)
                                        : "-"}
                                </Typography>
                            </Box>

                            {/* Status */}
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
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                mb={1}
                            >
                                Lokasi Absensi
                            </Typography>

                            <AttendanceLocationMap
                                checkInLat={selectedAttendance?.check_in_lat}
                                checkInLng={selectedAttendance?.check_in_lng}
                                checkOutLat={selectedAttendance?.check_out_lat}
                                checkOutLng={selectedAttendance?.check_out_lng}
                            />
                        </Box>
                        {/* Foto */}
                        {/* Foto Absensi */}
                        <Box>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                mb={2}
                            >
                                Foto Absensi
                            </Typography>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        sm: "1fr 1fr"
                                    },
                                    gap: 2
                                }}
                            >
                                {/* FOTO CHECK IN */}
                                <Box>
                                    <Typography
                                        variant="subtitle2"
                                        fontWeight={600}
                                        mb={1}
                                        color="success.main"
                                    >
                                        Check In
                                    </Typography>

                                    {selectedAttendance?.photo_path ? (
                                        <Box
                                            component="img"
                                            src={getAttendancePhotoUrl(
                                                selectedAttendance.photo_path
                                            )}
                                            alt="Foto Check In"
                                            sx={{
                                                width: "100%",
                                                height: 220,
                                                objectFit: "cover",
                                                borderRadius: 2,
                                                border: "1px solid #E5E7EB"
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                height: 220,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                bgcolor: "#F3F4F6",
                                                borderRadius: 2
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Foto Check In tidak tersedia
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                {/* FOTO CHECK OUT */}
                                <Box>
                                    <Typography
                                        variant="subtitle2"
                                        fontWeight={600}
                                        mb={1}
                                        color="error.main"
                                    >
                                        Check Out
                                    </Typography>

                                    {selectedAttendance?.check_out_photo_path ? (
                                        <Box
                                            component="img"
                                            src={getAttendancePhotoUrl(selectedAttendance.check_out_photo_path)}
                                            alt="Foto Check Out"
                                            sx={{
                                                width: "100%",
                                                height: 220,
                                                objectFit: "cover",
                                                borderRadius: 2
                                            }}
                                        />
                                    ) : (
                                        <Typography color="text.secondary">
                                            Foto Check Out tidak tersedia
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => {
                            setOpenAttendanceDetail(false);
                            setSelectedAttendance(null);
                        }}
                    >
                        Tutup
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );

}