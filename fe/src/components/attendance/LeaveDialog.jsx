import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Typography,
    Box
} from "@mui/material";

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";

export default function LeaveDialog({

    open,
    onClose,
    cutiType,
    setCutiType,
    leaveType,
    setLeaveType,

    startDate,
    setStartDate,

    endDate,
    setEndDate,

    startTime,
    setStartTime,

    endTime,
    setEndTime,

    reason,
    setReason,

    attachment,
    setAttachment,

    loading,
    onSubmit

}) {

    const isOvertime = leaveType === "LEMBUR";

    return (

        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
        >

            <DialogTitle>
                Pengajuan
            </DialogTitle>

            <DialogContent>

                {/* ========================= */}
                {/* JENIS PENGAJUAN */}
                {/* ========================= */}

                <FormControl
                    fullWidth
                    sx={{
                        mt: 1
                    }}
                >

                    <InputLabel>
                        Jenis Pengajuan
                    </InputLabel>

                    <Select
                        value={leaveType}
                        label="Jenis Pengajuan"
                        onChange={(e) => {

                            const value =
                                e.target.value;

                            setLeaveType(value);

                            // Reset field ketika
                            // pindah jenis pengajuan
                            setStartDate("");
                            setEndDate("");
                            setReason("");
                            setAttachment(null);

                            if (setStartTime) {
                                setStartTime("");
                            }

                            if (setEndTime) {
                                setEndTime("");
                            }

                            if (setCutiType) {
                                setCutiType("TAHUNAN");
                            }

                        }}
                    >

                        <MenuItem value="SAKIT">
                            Sakit
                        </MenuItem>

                        <MenuItem value="IZIN">
                            Izin
                        </MenuItem>

                        <MenuItem value="CUTI">
                            Cuti
                        </MenuItem>

                        <MenuItem value="LEMBUR">
                            Lembur
                        </MenuItem>

                    </Select>
                    {leaveType === "CUTI" && (
                        <Box sx={{ mt: 2 }}>

                            <FormControl fullWidth>

                                <InputLabel>
                                    Jenis Cuti
                                </InputLabel>

                                <Select
                                    value={cutiType}
                                    label="Jenis Cuti"
                                    onChange={(e) =>
                                        setCutiType(e.target.value)
                                    }
                                >

                                    <MenuItem value="TAHUNAN">
                                        Cuti Tahunan
                                    </MenuItem>

                                    <MenuItem value="MENIKAH">
                                        Menikah
                                    </MenuItem>

                                    <MenuItem value="MELAHIRKAN">
                                        Melahirkan
                                    </MenuItem>

                                    <MenuItem value="KELUARGA_MENINGGAL">
                                        Keluarga Meninggal
                                    </MenuItem>

                                </Select>

                            </FormControl>

                        </Box>
                    )}
                </FormControl>


                {/* ================================= */}
                {/* FORM LEMBUR */}
                {/* ================================= */}

                {isOvertime ? (

                    <>

                        {/* TANGGAL */}

                        <Box sx={{ mt: 2 }}>

                            <TextField
                                fullWidth
                                type="date"
                                label="Tanggal Lembur"
                                value={startDate}
                                onChange={(e) =>
                                    setStartDate(
                                        e.target.value
                                    )
                                }
                                InputLabelProps={{
                                    shrink: true
                                }}
                            />

                        </Box>


                        {/* JAM */}

                        <Box
                            sx={{
                                mt: 2,
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    sm: "1fr 1fr"
                                },
                                gap: 2
                            }}
                        >

                            <TextField
                                fullWidth
                                type="time"
                                label="Jam Mulai"
                                value={
                                    startTime || ""
                                }
                                onChange={(e) =>
                                    setStartTime(
                                        e.target.value
                                    )
                                }
                                InputLabelProps={{
                                    shrink: true
                                }}
                            />

                            <TextField
                                fullWidth
                                type="time"
                                label="Jam Selesai"
                                value={
                                    endTime || ""
                                }
                                onChange={(e) =>
                                    setEndTime(
                                        e.target.value
                                    )
                                }
                                InputLabelProps={{
                                    shrink: true
                                }}
                            />

                        </Box>


                        {/* ALASAN */}

                        <Box sx={{ mt: 2 }}>

                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Pekerjaan / Alasan Lembur"
                                placeholder="Contoh: Maintenance server..."
                                value={reason}
                                onChange={(e) =>
                                    setReason(
                                        e.target.value
                                    )
                                }
                            />

                        </Box>

                    </>

                ) : (

                    /* ================================= */
                    /* FORM CUTI / IZIN / SAKIT */
                    /* ================================= */

                    <>

                        <Box sx={{ mt: 2 }}>

                            <TextField
                                fullWidth
                                type="date"
                                label="Tanggal Mulai"
                                value={startDate}
                                onChange={(e) => {

                                    setStartDate(
                                        e.target.value
                                    );

                                    if (!endDate) {

                                        setEndDate(
                                            e.target.value
                                        );

                                    }

                                }}
                                InputLabelProps={{
                                    shrink: true
                                }}
                            />

                        </Box>


                        <Box sx={{ mt: 2 }}>

                            <TextField
                                fullWidth
                                type="date"
                                label="Tanggal Selesai"
                                value={endDate}
                                onChange={(e) =>
                                    setEndDate(
                                        e.target.value
                                    )
                                }
                                InputLabelProps={{
                                    shrink: true
                                }}
                            />

                        </Box>


                        <Box sx={{ mt: 2 }}>

                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Keterangan"
                                placeholder="Masukkan alasan pengajuan..."
                                value={reason}
                                onChange={(e) =>
                                    setReason(
                                        e.target.value
                                    )
                                }
                            />

                        </Box>


                        <Box sx={{ mt: 2 }}>

                            <Button
                                fullWidth
                                variant="outlined"
                                component="label"
                                startIcon={
                                    <AttachFileRoundedIcon />
                                }
                                sx={{
                                    height: 50,
                                    borderStyle: "dashed"
                                }}
                            >

                                Pilih Lampiran

                                <input
                                    hidden
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {

                                        if (
                                            e.target.files
                                                .length > 0
                                        ) {

                                            setAttachment(
                                                e.target.files[0]
                                            );

                                        }

                                    }}
                                />

                            </Button>

                            {attachment && (

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                        mt: 1
                                    }}
                                >
                                    {attachment.name}
                                </Typography>

                            )}

                        </Box>

                    </>

                )}

            </DialogContent>


            {/* ========================= */}
            {/* BUTTON */}
            {/* ========================= */}

            <DialogActions>

                <Button
                    onClick={onClose}
                    disabled={loading}
                >
                    Batal
                </Button>

                <Button
                    variant="contained"
                    onClick={onSubmit}
                    disabled={
                        loading ||
                        !startDate ||
                        !reason.trim() ||
                        (
                            isOvertime &&
                            (
                                !startTime ||
                                !endTime
                            )
                        ) ||
                        (
                            !isOvertime &&
                            !endDate
                        )
                    }
                >
                    {loading
                        ? "Mengirim"
                        : isOvertime
                            ? "Ajukan Lembur"
                            : "Kirim"
                    }
                </Button>

            </DialogActions>

        </Dialog>

    );
}