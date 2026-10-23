import {
    Card,
    CardContent,
    Typography,
    Stack
} from "@mui/material";

import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";

export default function LocationCard() {

    return (

        <Card
            elevation={2}
            sx={{
                borderRadius: 2,
            }}
        >

            <CardContent>

                <Typography
                    variant="h6"
                    mb={2}
                >
                    Lokasi
                </Typography>

                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                >

                    <LocationOnRoundedIcon
                        color="error"
                    />

                    <Typography>

                        PT KJI

                    </Typography>

                </Stack>

                <Typography
                    color="success.main"
                    mt={1}
                >
                    GPS Akurat
                </Typography>

            </CardContent>

        </Card>

    );

}