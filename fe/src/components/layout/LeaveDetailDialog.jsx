import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Stack,
    Divider,
    Chip
} from "@mui/material";

export default function LeaveDetailDialog({

    open,
    onClose,
    data

}) {

    if (!data) return null;

    const formatDate = (date) =>
        new Date(date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    const totalDays =
        Math.max(
            1,
            Math.ceil(
                (
                    new Date(data.end_date) -
                    new Date(data.start_date)
                ) / 86400000
            ) + 1
        );

    return (

        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
        >

            <DialogTitle>

                Detail Pengajuan

            </DialogTitle>

            <DialogContent>

                <Stack spacing={2}>

                    <Chip
                        label={data.status}
                        color={
                            data.status === "APPROVED"
                                ? "success"
                                : data.status === "REJECTED"
                                    ? "error"
                                    : "warning"
                        }
                        sx={{ width: "fit-content" }}
                    />

                    <Divider />

                    <BoxItem
                        title="🏥 Jenis"
                        value={data.leave_type}
                    />

                    <BoxItem
                        title="📅 Tanggal"
                        value={`${formatDate(data.start_date)} - ${formatDate(data.end_date)}`}
                    />

                    <BoxItem
                        title="⏳ Durasi"
                        value={`${totalDays} Hari`}
                    />

                    <BoxItem
                        title="📝 Keterangan"
                        value={data.reason || "-"}
                    />

                    <BoxItem
                        title="📎 Lampiran"
                        value={
                            data.attachment
                                ? "Ada Lampiran"
                                : "-"
                        }
                    />

                    <BoxItem
                        title="💬 Catatan HR"
                        value={data.approval_note || "-"}
                    />

                </Stack>

            </DialogContent>

            <DialogActions>

                <Button onClick={onClose}>

                    Tutup

                </Button>

            </DialogActions>

        </Dialog>

    );

}

function BoxItem({

    title,
    value

}) {

    return (

        <div>

            <Typography
                variant="caption"
                color="text.secondary"
            >

                {title}

            </Typography>

            <Typography
                fontWeight={600}
            >

                {value}

            </Typography>

        </div>

    );

}