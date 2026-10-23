import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from "@mui/material";

import CameraCard from "./CameraCard";
import {
    TextField
} from "@mui/material";

export default function AttendanceDialog({

    open,
    onClose,
    notes,
    setNotes,
    cameraRef,
    photo,
    setPhoto,

    loading,
    status,

    insideRadius,

    attendanceType,
    setAttendanceType,

    onConfirm

}) {

    return (

        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth="sm"
        >

            <DialogTitle>

                {
                    status === "checked-in"
                        ? "Check Out"
                        : "Check In"
                }

            </DialogTitle>

            <DialogContent>

                <CameraCard
                    ref={cameraRef}
                    photo={photo}
                    setPhoto={setPhoto}
                    loading={loading}
                />

                {insideRadius === false && status !== "checked-in" && (

                    <Box sx={{ mt: 1, mb: 2 }}>

                        <Typography
                            variant="subtitle2"
                            sx={{
                                mb: 1,
                                fontWeight: 600
                            }}
                        >
                            Jenis Absensi
                        </Typography>

                        <FormControl fullWidth size="small">

                            <Select
                                value={attendanceType}
                                onChange={(e) =>
                                    setAttendanceType(e.target.value)
                                }
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            maxHeight: 250,
                                            zIndex: 20000
                                        }
                                    }
                                }}
                            >
                                <MenuItem value="WFH">Work From Home</MenuItem>
                                <MenuItem value="CLIENT">Kunjungan Client</MenuItem>
                                <MenuItem value="MEETING">Meeting</MenuItem>
                                <MenuItem value="BUSINESS_TRIP">Perjalanan Dinas</MenuItem>
                                <MenuItem value="OTHER">Lainnya</MenuItem>
                            </Select>

                            {attendanceType === "OTHER" && (

                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Keterangan"
                                    placeholder="Masukkan alasan absensi..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    sx={{ mt: 2 }}
                                />

                            )}

                        </FormControl>

                    </Box>

                )}



            </DialogContent>

            <DialogActions>

                <Button
                    onClick={onClose}
                    disabled={loading}
                >
                    Batal
                </Button>


                <Button
                    variant="contained"
                    disabled={loading}
                    onClick={async () => {
                        // Check In dan Check Out wajib mengambil selfie
                        const image = await cameraRef.current?.capture();

                        if (!image) return;

                        await onConfirm(image);
                    }}
                >
                    {loading
                        ? "Memproses..."
                        : status === "checked-in"
                            ? "Konfirmasi Check Out"
                            : "Konfirmasi Check In"}
                </Button>


            </DialogActions>

        </Dialog>

    );

}