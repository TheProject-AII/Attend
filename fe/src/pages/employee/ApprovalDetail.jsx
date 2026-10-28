import {
    Box,
    Card,
    CardContent,
    Typography,
    Divider,
    Button,
    Stack,
    TextField,
    Skeleton
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams,
    useLocation
} from "react-router-dom";

import leaderService from "../../services/leaderService";
import Drawer from "@mui/material/Drawer";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

export default function ApprovalDetail() {

    const { id } = useParams();

    const navigate = useNavigate();
    const location = useLocation();

    const isAttendanceEdit =
        location.pathname.includes("/approval/attendance/");

    const [detail, setDetail] = useState(null);

    const [loading, setLoading] = useState(true);

    const [action, setAction] = useState(null);
    // "APPROVE" | "REJECT"

    const [note, setNote] = useState("");

    const [saving, setSaving] = useState(false);
    const [deductLeave, setDeductLeave] = useState(false);
    const [snackbar, setSnackbar] = useState({

        open: false,

        severity: "success",

        message: ""

    });

    const loadDetail = async () => {

        try {

            const { data } = isAttendanceEdit
                ? await leaderService.getAttendanceEditDetail(id)
                : await leaderService.getLeaveDetail(id);

            setDetail(data.data);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        loadDetail();

    }, [id, isAttendanceEdit]);

    const formatDate = (date) =>
        new Date(date).toLocaleDateString("en-US", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });

    const formatDateRange = (start, end) => {

        const startFormatted = formatDate(start);
        const endFormatted = formatDate(end);

        if (startFormatted === endFormatted) {
            return startFormatted;
        }

        return `${startFormatted} - ${endFormatted}`;

    };

    const getDuration = (start, end) => {

        const s = new Date(start);

        const e = new Date(end);

        return (
            Math.ceil(
                (e - s) / (1000 * 60 * 60 * 24)
            ) + 1
        );

    };

    if (loading) {

        return (

            <Box p={2}>

                <Skeleton height={50} />

                <Skeleton
                    height={120}
                    sx={{ mt: 2 }}
                />

                <Skeleton
                    height={250}
                    sx={{ mt: 2 }}
                />

            </Box>

        );

    }

    const handleSubmit = async () => {

        try {

            setSaving(true);

            if (isAttendanceEdit) {

                if (action === "APPROVE") {

                    await leaderService.approveAttendanceEdit(
                        id,
                        note,
                    );

                } else {

                    await leaderService.rejectAttendanceEdit(
                        id,
                        note
                    );

                }

            } else {

                if (action === "APPROVE") {

                    await leaderService.approve(
                        id,
                        note,
                        detail.leave_type === "SAKIT"
                            ? deductLeave
                            : false
                    );

                } else {

                    await leaderService.reject(
                        id,
                        note
                    );

                }

            }

            setSnackbar({

                open: true,

                severity: "success",

                message:
                    action === "APPROVE"

                        ? "Request approved successfully."

                        : "Request rejected successfully."

            });
            setAction(null);

            setTimeout(() => {

                navigate("/employee/approval");

            }, 2000);

        } catch (err) {

            alert(
                err.response?.data?.message ||
                "An error occurred."
            );

        } finally {

            setSaving(false);

        }

    };

    const formatTime = (date) => {
        if (!date) return "-";

        return new Date(date).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <Box
            sx={{
                height: "100%"
            }}
        >
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    bgcolor: "#F5F7FA",
                    px: 2,
                    py: 1,
                    borderBottom: "1px solid #E5E7EB"
                }}
            >

                <Typography
                    variant="h5"
                    fontWeight={700}
                >
                    Approval Details
                </Typography>

            </Box>
            <Box
                sx={{
                    p: 2,
                    pt: 1,
                    pb: 12 // Keep content clear of the bottom navigation.
                }}
            >

                <Card
                    sx={{
                        mt: 2,
                    }}
                >

                    <CardContent>
                        <InfoItem
                            title="Employee Name"
                            value={<>
                                <Typography fontWeight={600}>
                                    {detail.name}
                                </Typography>

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {detail.department} • {detail.position}
                                </Typography>
                            </>}
                        />
                        {!isAttendanceEdit && (
                            <>
                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Request Type"
                                    value={
                                        ({
                                            CUTI: "Leave",
                                            IZIN: "Permission",
                                            SAKIT: "Sick Leave",
                                            LEMBUR: "Overtime",
                                        })[detail.leave_type] || detail.leave_type
                                    }
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Date"
                                    value={formatDateRange(
                                        detail.start_date,
                                        detail.end_date
                                    )}
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Duration"
                                    value={`${detail.leave_days} days`}
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Annual Leave Entitlement"
                                    value={`${detail.leave_balance} days`}
                                />

                                {detail.leave_type === "CUTI" && (
                                    <>
                                        <Divider sx={{ my: 2 }} />

                                        <InfoItem
                                            title="Remaining After Approval"
                                            value={`${detail.remaining_leave} days`}
                                        />
                                    </>
                                )}
                            </>
                        )}
                        {isAttendanceEdit && (
                            <>
                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Request Type"
                                    value="Attendance Change"
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Date"
                                    value={formatDate(detail.attendance_date)}
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Check-in Time"
                                    value={
                                        <>
                                            {formatTime(detail.old_check_in)}
                                            {" → "}
                                            {formatTime(detail.new_check_in)}
                                        </>
                                    }
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Check-out Time"
                                    value={
                                        <>
                                            {formatTime(detail.old_check_out)}
                                            {" → "}
                                            {formatTime(detail.new_check_out)}
                                        </>
                                    }
                                />
                            </>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Typography
                            fontWeight={600}
                            mb={1}
                        >
                            Reason
                        </Typography>

                        <Typography
                            color="text.secondary"
                        >
                            {detail.reason}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Typography
                            fontWeight={600}
                            mb={1}
                        >
                            Attachment
                        </Typography>

                        {

                            detail.attachment

                                ?

                                <Button>

                                    View Attachment

                                </Button>

                                :

                                <Typography
                                    color="text.secondary"
                                >

                                    No attachment

                                </Typography>

                        }
                        {!isAttendanceEdit &&
                            detail.leave_type === "SAKIT" && (
                                <>
                                    <Divider sx={{ my: 2 }} />

                                    <Typography
                                        fontWeight={600}
                                        mb={1}
                                    >
                                        Deduct Annual Leave?
                                    </Typography>

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                    >
                                        <Button
                                            variant={
                                                deductLeave
                                                    ? "contained"
                                                    : "outlined"
                                            }
                                            color="success"
                                            onClick={() =>
                                                setDeductLeave(true)
                                            }
                                        >
                                            Yes
                                        </Button>

                                        <Button
                                            variant={
                                                !deductLeave
                                                    ? "contained"
                                                    : "outlined"
                                            }
                                            color="inherit"
                                            onClick={() =>
                                                setDeductLeave(false)
                                            }
                                        >
                                            No
                                        </Button>
                                    </Stack>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mt: 1 }}
                                    >
                                        Select "Yes" to deduct this sick leave request
                                        from the annual leave balance.
                                    </Typography>
                                </>
                            )}
                    </CardContent>

                </Card>

                <Stack
                    spacing={2}
                    sx={{
                        mt: 4,
                        mb: 2
                    }}
                >

                    <Stack spacing={2} mt={4}>

                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            size="large"
                            onClick={() => {
                                setAction("REJECT");
                                setNote("");
                            }}
                        >
                            Reject
                        </Button>

                        <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            size="large"
                            disabled={
                                !isAttendanceEdit &&
                                !detail.can_approve
                            }
                            onClick={() => {
                                setAction("APPROVE");
                                setNote("");
                            }}
                        >
                            Approve
                        </Button>

                    </Stack>

                </Stack>
                <Drawer
                    anchor="bottom"
                    open={Boolean(action)}
                    onClose={() => setAction(null)}
                    PaperProps={{
                        sx: {
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                        }
                    }}
                >
                    <Stack
                        spacing={3}
                        sx={{
                            p: 3
                        }}
                    >

                        <Box>

                            <Typography
                                variant="h6"
                                fontWeight={700}
                            >
                                {
                                    action === "APPROVE"
                                        ? "Approve Request"
                                        : "Reject Request"
                                }
                            </Typography>

                            <Typography
                                color="text.secondary"
                                mt={1}
                            >
                                {
                                    action === "APPROVE"
                                        ? "Note (Optional)"
                                        : "Rejection Reason"
                                }
                            </Typography>

                        </Box>

                        <TextField
                            fullWidth
                            multiline
                            rows={5}
                            placeholder={
                                action === "APPROVE"
                                    ? "Add a note..."
                                    : "Enter a reason for rejection..."
                            }
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />

                        <Stack
                            direction="row"
                            spacing={2}
                        >

                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setAction(null)}
                            >
                                Cancel
                            </Button>

                            <Button
                                fullWidth
                                variant="contained"
                                color={
                                    action === "APPROVE"
                                        ? "success"
                                        : "error"
                                }
                                disabled={saving}
                                onClick={handleSubmit}
                            >
                                {saving
                                    ? "Processing..."
                                    : action === "APPROVE"
                                        ? "Approve"
                                        : "Reject"}
                            </Button>

                        </Stack>

                    </Stack>

                </Drawer>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={2500}
                    anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "center"
                    }}
                    sx={{
                        bottom: action ? 320 : 90
                    }}
                    onClose={() =>
                        setSnackbar({
                            ...snackbar,
                            open: false
                        })
                    }
                >
                    <Alert
                        severity={snackbar.severity}
                        variant="filled"
                        sx={{
                            width: "100%"
                        }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Box>
    );



}

function InfoItem({

    title,

    value

}) {

    return (

        <Box>

            <Typography

                fontSize={13}
                fontWeight={700}
                color="text.primary"

            >

                {title}

            </Typography>

            <Typography

                mt={.5}

                fontWeight={600}

            >

                {value}

            </Typography>

        </Box>

    );

}
