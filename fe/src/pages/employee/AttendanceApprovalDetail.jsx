import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Button,
    Divider,
    TextField,
    CircularProgress,
    Alert
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";

import leaderService from "../../services/leaderService";

export default function AttendanceApprovalDetail() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [note, setNote] = useState("");

    const loadData = async () => {

        try {

            setLoading(true);

            const result =
                await leaderService.getAttendanceEditDetail(id);

            setData(result.data);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        loadData();
    }, [id]);

    const formatDate = (date) => {

        if (!date) return "-";

        return new Date(date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    };

    const formatTime = (date) => {

        if (!date) return "-";

        return new Date(date).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });

    };

    const handleApprove = async () => {

        try {

            setProcessing(true);

            await leaderService.approveAttendanceEdit(
                id,
                note
            );

            navigate("/employee/approval");

        } catch (err) {

            console.error(err);

        } finally {

            setProcessing(false);

        }

    };

    const handleReject = async () => {

        if (!note.trim()) {
            alert("Alasan penolakan wajib diisi.");
            return;
        }

        try {

            setProcessing(true);

            await leaderService.rejectAttendanceEdit(
                id,
                note
            );

            navigate("/employee/approval");

        } catch (err) {

            console.error(err);

        } finally {

            setProcessing(false);

        }

    };

    if (loading) {

        return (
            <Box
                sx={{
                    minHeight: "50vh",
                    display: "grid",
                    placeItems: "center"
                }}
            >
                <CircularProgress />
            </Box>
        );

    }

    if (!data) {

        return (
            <Alert severity="error">
                Data pengajuan tidak ditemukan.
            </Alert>
        );

    }

    return (

        <Box
            sx={{
                p: 2,
                pb: 10
            }}
        >

            <Typography
                variant="h5"
                fontWeight={700}
                mb={1}
            >
                Perubahan Absensi
            </Typography>

            <Typography
                color="text.secondary"
                mb={3}
            >
                Review pengajuan perubahan jam absensi karyawan.
            </Typography>


            {/* KARYAWAN */}

            <Card
                elevation={0}
                sx={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 2,
                    mb: 2
                }}
            >

                <CardContent>

                    <Typography
                        fontWeight={700}
                        mb={2}
                    >
                        Informasi Karyawan
                    </Typography>

                    <Stack spacing={1}>

                        <Typography>
                            <strong>Nama:</strong>{" "}
                            {data.name}
                        </Typography>

                        <Typography>
                            <strong>Email:</strong>{" "}
                            {data.email}
                        </Typography>

                        <Typography>
                            <strong>Departemen:</strong>{" "}
                            {data.department || "-"}
                        </Typography>

                        <Typography>
                            <strong>Tanggal:</strong>{" "}
                            {formatDate(data.attendance_date)}
                        </Typography>

                    </Stack>

                </CardContent>

            </Card>


            {/* PERUBAHAN JAM */}

            <Card
                elevation={0}
                sx={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 2,
                    mb: 2
                }}
            >

                <CardContent>

                    <Typography
                        fontWeight={700}
                        mb={2}
                    >
                        Perubahan Jam Absensi
                    </Typography>

                    <Stack spacing={2}>

                        <Box>

                            <Typography
                                color="text.secondary"
                                fontSize={14}
                            >
                                Jam Masuk
                            </Typography>

                            <Typography
                                fontSize={20}
                                fontWeight={700}
                            >
                                {formatTime(data.old_check_in)}
                                {" → "}
                                {formatTime(data.new_check_in)}
                            </Typography>

                        </Box>

                        <Divider />

                        <Box>

                            <Typography
                                color="text.secondary"
                                fontSize={14}
                            >
                                Jam Pulang
                            </Typography>

                            <Typography
                                fontSize={20}
                                fontWeight={700}
                            >
                                {formatTime(data.old_check_out)}
                                {" → "}
                                {formatTime(data.new_check_out)}
                            </Typography>

                        </Box>

                    </Stack>

                </CardContent>

            </Card>


            {/* ALASAN */}

            <Card
                elevation={0}
                sx={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 2,
                    mb: 2
                }}
            >

                <CardContent>

                    <Typography
                        fontWeight={700}
                        mb={1}
                    >
                        Alasan Perubahan
                    </Typography>

                    <Typography color="text.secondary">
                        {data.reason}
                    </Typography>

                </CardContent>

            </Card>


            {/* NOTE ATASAN */}

            {data.status === "PENDING" && (

                <Card
                    elevation={0}
                    sx={{
                        border: "1px solid #E5E7EB",
                        borderRadius: 2,
                        mb: 2
                    }}
                >

                    <CardContent>

                        <Typography
                            fontWeight={700}
                            mb={1}
                        >
                            Catatan Atasan
                        </Typography>

                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            placeholder="Tambahkan catatan..."
                            value={note}
                            onChange={(e) =>
                                setNote(e.target.value)
                            }
                        />

                    </CardContent>

                </Card>

            )}


            {/* BUTTON */}

            {data.status === "PENDING" && (

                <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="flex-end"
                >

                    <Button
                        variant="outlined"
                        color="error"
                        disabled={processing}
                        onClick={handleReject}
                    >
                        {processing
                            ? <CircularProgress size={20} />
                            : "Tolak"}
                    </Button>

                    <Button
                        variant="contained"
                        color="success"
                        disabled={processing}
                        onClick={handleApprove}
                    >
                        {processing
                            ? <CircularProgress size={20} />
                            : "Setujui"}
                    </Button>

                </Stack>

            )}

        </Box>

    );

}