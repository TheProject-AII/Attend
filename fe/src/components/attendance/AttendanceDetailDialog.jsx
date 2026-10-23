import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Typography,
    Divider,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Paper,
    Box,
    Card,
    CardContent
} from "@mui/material";

import { useEffect, useState } from "react";
import {
    CircularProgress
} from "@mui/material";
import attendanceService from "../../services/attService";


export default function AttendanceDetailDialog({
    open,
    onClose,
    data,
    month,
    year
}) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {

        if (!open || !data) return;



        loadHistory();

    }, [open, data, month, year]);
    if (!data) return null;
    const loadHistory = async () => {

        try {

            setLoading(true);

            setHistory([]);

            const result =
                await attendanceService.getEmployeeAttendance(
                    data.id,
                    month,
                    year
                );

            setHistory(result.data);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    };
    return (

        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    height: "85vh",
                    display: "flex"
                }
            }}
        >

            <DialogTitle>
                Detail Rekap Absensi
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "hidden",
                    p: 3
                }}
            >
                <Box
                    sx={{
                        flexShrink: 0
                    }}
                >
                    <Typography
                        variant="h6"
                        fontWeight={700}
                    >
                        {data.name}
                    </Typography>

                    <Typography
                        color="text.secondary"
                        mb={3}
                    >
                        {data.department}
                    </Typography>

                    <Grid
                        container
                        spacing={2}
                    >

                        <Grid size={{
                            xs: 6,
                            sm: 4,
                            md: 2
                        }}>

                            <Card
                                elevation={0}
                                sx={{
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 1
                                }}
                            >

                                <CardContent sx={{
                                    py: 1.5,
                                    "&:last-child": {
                                        pb: 1.5
                                    }
                                }}>

                                    <Typography
                                        variant="h5"
                                        color="success.main"
                                        fontWeight={700}
                                    >
                                        {data.present}
                                    </Typography>

                                    <Typography
                                        color="text.secondary"
                                    >
                                        Hari Hadir
                                    </Typography>

                                </CardContent>

                            </Card>

                        </Grid>

                        <Grid size={{
                            xs: 6,
                            sm: 4,
                            md: 2
                        }}>

                            <Card
                                elevation={0}
                                sx={{
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 1
                                }}
                            >

                                <CardContent sx={{
                                    py: 1.5,
                                    "&:last-child": {
                                        pb: 1.5
                                    }
                                }}>

                                    <Typography
                                        variant="h5"
                                        color="warning.main"
                                        fontWeight={700}
                                    >
                                        {data.late}x
                                    </Typography>

                                    <Typography
                                        color="text.secondary"
                                    >
                                        Terlambat
                                    </Typography>

                                </CardContent>

                            </Card>

                        </Grid>

                        <Grid size={{
                            xs: 6,
                            sm: 4,
                            md: 2
                        }}>

                            <Card
                                elevation={0}
                                sx={{
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 1,
                                }}
                            >

                                <CardContent sx={{
                                    py: 1.5,
                                    "&:last-child": {
                                        pb: 1.5
                                    }
                                }}>

                                    <Typography
                                        variant="h5"
                                        color="error.main"
                                        fontWeight={700}
                                    >
                                        {data.late_minutes}
                                    </Typography>

                                    <Typography
                                        color="text.secondary"
                                    >
                                        Menit Telat
                                    </Typography>

                                </CardContent>

                            </Card>

                        </Grid>

                        <Grid size={{
                            xs: 6,
                            sm: 4,
                            md: 2
                        }}>

                            <Card
                                elevation={0}
                                sx={{
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 1
                                }}
                            >

                                <CardContent sx={{
                                    py: 1.5,
                                    "&:last-child": {
                                        pb: 1.5
                                    }
                                }}>

                                    <Typography
                                        variant="h5"
                                        color="info.main"
                                        fontWeight={700}
                                    >
                                        {data.leave}
                                    </Typography>

                                    <Typography
                                        color="text.secondary"
                                    >
                                        Cuti
                                    </Typography>

                                </CardContent>

                            </Card>

                        </Grid>

                        <Grid size={{
                            xs: 6,
                            sm: 4,
                            md: 2
                        }}>

                            <Card
                                elevation={0}
                                sx={{
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 1
                                }}
                            >

                                <CardContent sx={{
                                    py: 1.5,
                                    "&:last-child": {
                                        pb: 1.5
                                    }
                                }}>

                                    <Typography
                                        variant="h5"
                                        color="primary.main"
                                        fontWeight={700}
                                    >
                                        {data.permission}
                                    </Typography>

                                    <Typography
                                        color="text.secondary"
                                    >
                                        Izin
                                    </Typography>

                                </CardContent>

                            </Card>

                        </Grid>

                        <Grid size={{
                            xs: 6,
                            sm: 4,
                            md: 2
                        }}>

                            <Card
                                elevation={0}
                                sx={{
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 1
                                }}
                            >

                                <CardContent sx={{
                                    py: 1.5,
                                    "&:last-child": {
                                        pb: 1.5
                                    }
                                }}>

                                    <Typography
                                        variant="h5"
                                        color="secondary.main"
                                        fontWeight={700}
                                    >
                                        {data.sick}
                                    </Typography>

                                    <Typography
                                        color="text.secondary"
                                    >
                                        Sakit
                                    </Typography>

                                </CardContent>

                            </Card>

                        </Grid>

                    </Grid>
                </Box>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        minHeight: 0,
                        mt: 3
                    }}
                >
                    <Box
                        sx={{
                            position: "sticky",
                            top: 0,
                            bgcolor: "#fff",
                            zIndex: 10,
                            py: 1
                        }}
                    >

                        <Typography
                            variant="h6"
                            fontWeight={700}
                        >
                            Riwayat Absensi
                        </Typography>

                    </Box>

                    {loading ? (

                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                height: 250
                            }}
                        >

                            <CircularProgress />

                        </Box>

                    ) : (

                        <TableContainer
                            component={Paper}
                            elevation={0}
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                overflowY: "auto",
                                border: "1px solid #E5E7EB",
                                borderRadius: 2
                            }}
                        >

                            <Table
                                stickyHeader
                                size="small"
                            >
                                <TableHead>

                                    <TableRow>
                                        <TableCell>
                                            No.
                                        </TableCell>

                                        <TableCell>Tanggal</TableCell>

                                        <TableCell>Masuk</TableCell>

                                        <TableCell>Pulang</TableCell>

                                        <TableCell>Status</TableCell>

                                    </TableRow>

                                </TableHead>

                                <TableBody>

                                    {history.map((item, index) => (

                                        <TableRow key={index}>
                                            <TableCell>
                                                {index + 1}
                                            </TableCell>

                                            <TableCell>
                                                {new Date(item.attendance_date).toLocaleDateString(
                                                    "id-ID",
                                                    {
                                                        day: "2-digit",
                                                        month: "long",
                                                        year: "numeric"
                                                    }
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {item.check_in
                                                    ? item.check_in.substring(11, 16)
                                                    : "-"}
                                            </TableCell>

                                            <TableCell>
                                                {item.check_out
                                                    ? item.check_out.substring(11, 16)
                                                    : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {item.status}
                                            </TableCell>

                                        </TableRow>

                                    ))}

                                </TableBody>

                            </Table>
                        </TableContainer>

                    )}
                </Box>
            </DialogContent>

            <DialogActions
                sx={{
                    flexShrink: 0,
                    borderTop: "1px solid #E5E7EB",
                    px: 3,
                    py: 2
                }}
            >

                <Button
                    variant="contained"
                    onClick={onClose}
                >
                    Tutup
                </Button>

            </DialogActions>

        </Dialog>

    );

}