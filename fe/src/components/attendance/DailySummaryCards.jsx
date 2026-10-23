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
                label={`Hadir (${data.hadir} Orang)`}
            />

            <Chip
                color="warning"
                icon={<AccessTimeIcon />}
                label={`Terlambat (${data.terlambat} Orang)`}
            />

            <Chip
                color="primary"
                icon={<LogoutIcon />}
                label={`Belum Pulang (${data.belum_pulang} Orang)`}
            />

            <Chip
                color="error"
                icon={<HighlightOffIcon />}
                label={`Belum Check In (${data.belum_checkin} Orang)`}
            />

        </Stack>

    );

}