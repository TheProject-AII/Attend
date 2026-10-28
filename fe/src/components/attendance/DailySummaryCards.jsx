import {
    Stack,
    Chip
} from "@mui/material";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LogoutIcon from "@mui/icons-material/Logout";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";

export default function DailySummaryCards({
    data = {
        hadir: 0,
        terlambat: 0,
        belum_pulang: 0,
        belum_checkin: 0
    }
}) {

    return (

        <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
            sx={{
                mb: 2
            }}
        >

            <Chip
                color="success"
                icon={<CheckCircleIcon />}
                label={`Present (${data.hadir} employees)`}
            />

            <Chip
                color="warning"
                icon={<AccessTimeIcon />}
                label={`Late (${data.terlambat} employees)`}
            />

            <Chip
                color="primary"
                icon={<LogoutIcon />}
                label={`Not Checked Out (${data.belum_pulang} employees)`}
            />

            <Chip
                color="error"
                icon={<HighlightOffIcon />}
                label={`Not Checked In (${data.belum_checkin} employees)`}
            />

        </Stack>

    );

}