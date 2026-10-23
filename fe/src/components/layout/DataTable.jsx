import {
    Card,
    CardContent,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    TableContainer,
    Paper
} from "@mui/material";

import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";

export default function AttendanceTable({ data }) {

    return (
        <Card
            elevation={0}
            sx={{
                mt: 3,
                borderRadius: 1,
                border: "1px solid #E5E7EB",
            }}
        >
            <CardContent>

                <Typography
                    variant="h6"
                    fontWeight={700}
                    mb={2}
                >
                    Riwayat Absensi
                </Typography>

                <TableContainer component={Paper} elevation={0}>

                    <Table>

                        <TableHead>

                            <TableRow
                                sx={{
                                    bgcolor: "#F8FAFC",
                                }}
                            >
                                <TableCell><strong>Nama</strong></TableCell>

                                <TableCell><strong>Divisi</strong></TableCell>

                                <TableCell><strong>Check In</strong></TableCell>

                                <TableCell><strong>Check Out</strong></TableCell>

                                <TableCell><strong>Status</strong></TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>

                            {data.map((item, index) => (

                                <TableRow
                                    key={item.id}
                                    hover
                                    sx={{
                                        bgcolor:
                                            index % 2 === 0
                                                ? "#FFFFFF"
                                                : "#FCFCFC",
                                    }}
                                >

                                    <TableCell>
                                        <Typography fontWeight={600}>
                                            {item.name}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        {item.department || "-"}
                                    </TableCell>
                                    <TableCell>

                                        <LoginIcon
                                            color="success"
                                            sx={{
                                                mr: 1,
                                                fontSize: 18
                                            }}
                                        />

                                        {item.check_in || "-"}

                                    </TableCell>
                                    <TableCell>

                                        <LogoutIcon
                                            color="warning"
                                            sx={{
                                                mr: 1,
                                                fontSize: 18
                                            }}
                                        />

                                        {item.check_out || "-"}

                                    </TableCell>

                                    <TableCell>

                                        <Chip
                                            size="small"
                                            label={item.status}
                                            sx={{
                                                minWidth: 95,
                                                fontWeight: 600,
                                                color: "#fff",
                                                bgcolor:
                                                    item.status === "Hadir"
                                                        ? "#16A34A"
                                                        : item.status === "Terlambat"
                                                            ? "#F59E0B"
                                                            : item.status === "Pulang"
                                                                ? "#2563EB"
                                                                : "#6B7280"
                                            }}
                                        />

                                    </TableCell>

                                </TableRow>

                            ))}

                        </TableBody>

                    </Table>

                </TableContainer>

            </CardContent>
        </Card>
    );
}