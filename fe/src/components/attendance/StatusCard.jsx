import {
    Card,
    CardContent,
    Divider,
    Typography,
    Stack
} from "@mui/material";

export default function StatusCard({

    checkIn,
    checkOut,

}) {

    return (

        <Card
            elevation={2}
            sx={{
                borderRadius: 5,
            }}
        >

            <CardContent>

                <Typography
                    variant="h6"
                    mb={2}
                >
                    Attendance Status
                </Typography>

                <Stack spacing={2}>

                    <Stack
                        direction="row"
                        justifyContent="space-between"
                    >
                        <Typography color="text.secondary">
                            Check In
                        </Typography>

                        <Typography fontWeight={600}>
                            {checkIn
                                ? checkIn.toLocaleTimeString("en-US")
                                : "-"}
                        </Typography>
                    </Stack>

                    <Divider />

                    <Stack
                        direction="row"
                        justifyContent="space-between"
                    >
                        <Typography color="text.secondary">
                            Check Out
                        </Typography>

                        <Typography fontWeight={600}>
                            {checkOut
                                ? checkOut.toLocaleTimeString("en-US")
                                : "-"}
                        </Typography>
                    </Stack>

                </Stack>

            </CardContent>

        </Card>

    );

}