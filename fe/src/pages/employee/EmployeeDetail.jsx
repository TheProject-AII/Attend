import {
    Avatar,
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";

export default function EmployeeDetail({
    open,
    employee,
    onClose,
}) {

    if (!employee) {
        return null;
    }
    const API_BASE_URL =
        "https://kji-attendance-be-production-91fc.up.railway.app";
    const formatDate = (date) => {

        if (!date) {
            return "-";
        }

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return "-";
        }

        return d.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

    };


    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
        >

            {/* HEADER */}

            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >

                <Box>

                    <Typography
                        fontWeight={700}
                        fontSize={20}
                    >
                        Detail Karyawan
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                    >
                        Informasi lengkap karyawan
                    </Typography>

                </Box>


                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>

            </DialogTitle>


            <DialogContent>

                {/* PROFILE */}

                <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{
                        mb: 3,
                        mt: 1,
                    }}
                >

                    <Avatar
                        src={
                            employee.photo
                                ? `${API_BASE_URL}${employee.photo}`
                                : undefined
                        }
                        sx={{
                            width: 80,
                            height: 80,
                            fontSize: 28,
                        }}
                    >
                        {employee.name
                            ?.charAt(0)
                            ?.toUpperCase()}
                    </Avatar>


                    <Box>

                        <Typography
                            fontSize={20}
                            fontWeight={700}
                        >
                            {employee.name}
                        </Typography>

                        <Typography
                            color="text.secondary"
                        >
                            {employee.position || "-"}
                        </Typography>

                        <Stack
                            direction="row"
                            spacing={1}
                            mt={1}
                        >

                            <Chip
                                label={
                                    employee.department ||
                                    "-"
                                }
                                size="small"
                            />

                            <Chip
                                label={
                                    employee.status
                                        ? "Aktif"
                                        : "Nonaktif"
                                }
                                color={
                                    employee.status
                                        ? "success"
                                        : "default"
                                }
                                size="small"
                            />

                        </Stack>

                    </Box>

                </Stack>


                <Divider sx={{ mb: 3 }} />


                {/* DATA PRIBADI */}

                <Typography
                    fontWeight={700}
                    mb={2}
                >
                    Data Pribadi
                </Typography>


                <Grid
                    container
                    spacing={2.5}
                    mb={3}
                >

                    <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                            label="NIK"
                            value={employee.nik}
                        />
                    </Grid>


                    <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                            label="Nama Lengkap"
                            value={employee.name}
                        />
                    </Grid>


                    <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                            label="Email"
                            value={employee.email}
                        />
                    </Grid>


                    <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                            label="No. HP"
                            value={employee.phone}
                        />
                    </Grid>


                    <Grid size={{ xs: 12 }}>
                        <DetailItem
                            label="Alamat"
                            value={employee.address}
                        />
                    </Grid>

                </Grid>


                <Divider sx={{ mb: 3 }} />

                <Typography
                    fontWeight={700}
                    mb={2}
                >
                    Dokumen
                </Typography>

                <Box sx={{ mb: 3 }}>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        mb={1}
                    >
                        Kartu Tanda Penduduk (KTP)
                    </Typography>

                    {employee.ktp ? (
                        <Box
                            component="img"
                            src={`${API_BASE_URL}${employee.ktp}`}
                            alt="KTP"
                            sx={{
                                width: "100%",
                                maxWidth: 600,
                                maxHeight: 350,
                                objectFit: "contain",
                                borderRadius: 2,
                                border: "1px solid #E5E7EB",
                                cursor: "pointer",
                            }}
                            onClick={() =>
                                window.open(
                                    `${API_BASE_URL}${employee.ktp}`,
                                    "_blank"
                                )
                            }
                        />
                    ) : (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            KTP belum tersedia
                        </Typography>
                    )}

                </Box>



                <Divider sx={{ mb: 3 }} />
                {/* DATA PEKERJAAN */}

                <Typography
                    fontWeight={700}
                    mb={2}
                >
                    Data Pekerjaan
                </Typography>


                <Grid
                    container
                    spacing={2.5}
                    mb={3}
                >

                    <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                            label="Departemen"
                            value={employee.department}
                        />
                    </Grid>


                    <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                            label="Jabatan"
                            value={employee.position}
                        />
                    </Grid>


                    <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                            label="Tanggal Masuk"
                            value={formatDate(
                                employee.join_date
                            )}
                        />
                    </Grid>


                    <Grid size={{ xs: 12, md: 6 }}>
                        <DetailItem
                            label="Jenis Karyawan"
                            value={
                                employee.employee_type ===
                                    "KONTRAK"
                                    ? "Pegawai Kontrak"
                                    : "Pegawai Tetap"
                            }
                        />
                    </Grid>

                </Grid>


                {/* KONTRAK */}

                {employee.employee_type === "KONTRAK" && (
                    <>
                        <Divider sx={{ mb: 3 }} />

                        <Typography
                            fontWeight={700}
                            mb={2}
                        >
                            Masa Kontrak
                        </Typography>

                        <Grid
                            container
                            spacing={2.5}
                            mb={3}
                        >

                            <Grid
                                size={{
                                    xs: 12,
                                    md: 6,
                                }}
                            >

                                <DetailItem
                                    label="Mulai Kontrak"
                                    value={formatDate(
                                        employee.contract_start_date
                                    )}
                                />

                            </Grid>


                            <Grid
                                size={{
                                    xs: 12,
                                    md: 6,
                                }}
                            >

                                <DetailItem
                                    label="Akhir Kontrak"
                                    value={formatDate(
                                        employee.contract_end_date
                                    )}
                                />

                            </Grid>

                        </Grid>
                    </>
                )}

            </DialogContent>

        </Dialog>
    );
}


/* ========================= */
/* DETAIL ITEM */
/* ========================= */

function DetailItem({
    label,
    value,
}) {

    return (
        <Box>

            <Typography
                variant="caption"
                color="text.secondary"
            >
                {label}
            </Typography>

            <Typography
                fontWeight={600}
                mt={0.3}
            >
                {value || "-"}
            </Typography>

        </Box>
    );

}