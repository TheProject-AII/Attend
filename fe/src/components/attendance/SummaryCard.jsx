import {
    Card,
    CardContent,
    Typography,
    Stack
} from "@mui/material";

export default function SummaryCard({
    title,
    value,
    color
}) {

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: 3,
                border: "1px solid #E5E7EB",
                height: 80
            }}
        >

            <CardContent>

                <Stack spacing={1}>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                    >
                        {title}
                    </Typography>

                    <Typography
                        variant="h3"
                        fontWeight={700}
                        sx={{
                            color,
                            lineHeight: 1
                        }}
                    >
                        {value}
                    </Typography>

                </Stack>

            </CardContent>

        </Card>

    );

}