import { Card, CardContent, Typography } from "@mui/material";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function CalendarCard() {
    return (
        <Card
            elevation={2}
            sx={{
                borderRadius: 3,
                height: "100%"
            }}
        >
            <CardContent>

                <Typography
                    variant="h6"
                    fontWeight={600}
                    mb={2}
                >
                    Kalender
                </Typography>

                <Calendar />

            </CardContent>
        </Card>
    );
}