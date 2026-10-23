import {
    Card,
    CardContent,
    Typography,
    Box,
    Avatar
} from "@mui/material";

export default function StatCard({
    title,
    value,
    icon,
    subtitle,

    color = "#1976d2"
}) {

    return (

        <Card
            elevation={0}
            sx={{
                borderRadius: 1,
                border: "1px solid #E5E7EB",
                transition: ".25s",
                "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 10px 25px rgba(0,0,0,.08)"
                }
            }}
        >

            <CardContent sx={{ p: 3 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "flex-start"
                    }}
                >

                    <Box sx={{ flex: 1 }}>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            {title}
                        </Typography>

                        <Typography
                            sx={{
                                fontSize: 42,
                                fontWeight: 700,
                                lineHeight: 1.2,
                                mt: .5
                            }}
                        >
                            {value}
                        </Typography>

                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            {subtitle}
                        </Typography>

                    </Box>

                    <Avatar
                        sx={{
                            width: 54,
                            height: 54,
                            bgcolor: `${color}20`,
                            color,
                            ml: 2
                        }}
                    >
                        {icon}
                    </Avatar>

                </Box>

            </CardContent>

        </Card>

    );

}