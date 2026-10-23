import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Skeleton,
    Stack,
    Typography
} from "@mui/material";

import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];

const colors = [
    {
        bg: "#FFF8E1",
        border: "#FBC02D"
    },
    {
        bg: "#F5F5F5",
        border: "#BDBDBD"
    },
    {
        bg: "#FFF3E0",
        border: "#A1887F"
    },
    {
        bg: "#FFFFFF",
        border: "#E5E7EB"
    },
    {
        bg: "#FFFFFF",
        border: "#E5E7EB"
    }
];

export default function EmployeeOfMonth({

    data = [],

    loading = false

}) {

    return (

        <Card
            elevation={0}
            sx={{
                mt: 3,
                borderRadius: 3,
                border: "1px solid #E5E7EB"
            }}
        >

            <CardContent>

                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    mb={3}
                >

                    <EmojiEventsIcon
                        sx={{
                            color: "#F59E0B"
                        }}
                    />

                    <Typography
                        variant="h6"
                        fontWeight={700}
                    >
                        Employee Of The Month
                    </Typography>

                </Stack>

                <Grid
                    container
                    spacing={2}
                >

                    {loading

                        ? [...Array(5)].map((_, index) => (

                            <Grid
                                key={index}
                                size={{ xs: 12, md: 2.4 }}
                            >

                                <Card
                                    variant="outlined"
                                    sx={{
                                        borderRadius: 3
                                    }}
                                >

                                    <CardContent>

                                        <Skeleton
                                            variant="circular"
                                            width={70}
                                            height={70}
                                            sx={{ mx: "auto" }}
                                        />

                                        <Skeleton
                                            height={30}
                                        />

                                        <Skeleton
                                            height={20}
                                        />

                                        <Skeleton
                                            height={25}
                                        />

                                    </CardContent>

                                </Card>

                            </Grid>

                        ))

                        :

                        data.map((item, index) => (

                            <Grid
                                key={item.id}
                                size={{ xs: 12, sm: 6, md: 2.4 }}
                            >

                                <Card
                                    elevation={0}
                                    sx={{
                                        position: "relative",
                                        borderRadius: 1,
                                        border: `2px solid ${colors[index].border}`,
                                        bgcolor: colors[index].bg,
                                        transition: ".25s",
                                        height: "100%",

                                        "&:hover": {
                                            transform: "translateY(-6px)",
                                            boxShadow: 4
                                        }
                                    }}
                                >

                                    <CardContent>

                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: 12,
                                                right: 12,
                                                width: 30,
                                                height: 30,
                                                borderRadius: "50%",
                                                bgcolor:
                                                    index === 0
                                                        ? "#F59E0B"
                                                        : index === 1
                                                            ? "#9CA3AF"
                                                            : index === 2
                                                                ? "#B45309"
                                                                : "#0F766E",
                                                color: "#fff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 700,
                                                fontSize: 14,
                                                boxShadow: 2
                                            }}
                                        >
                                            {index + 1}
                                        </Box>

                                        <Avatar
                                            sx={{
                                                width: 72,
                                                height: 72,
                                                mx: "auto",
                                                mt: 1,
                                                mb: 2,
                                                bgcolor: "#16A34A",
                                                fontSize: 28,
                                                fontWeight: 700
                                            }}
                                        >
                                            {item.name.charAt(0)}
                                        </Avatar>

                                        <Typography
                                            align="center"
                                            fontWeight={700}
                                            fontSize={16}
                                        >
                                            {item.name}
                                        </Typography>

                                        <Typography
                                            align="center"
                                            color="text.secondary"
                                            fontSize={13}
                                            mb={2}
                                        >
                                            {item.department}
                                        </Typography>

                                        <Chip
                                            label={`${item.percent}% Hadir`}
                                            color="success"
                                            size="small"
                                            sx={{
                                                width: "100%",
                                                mb: 1
                                            }}
                                        />

                                        <Chip
                                            label={`${item.late}x Terlambat`}
                                            color={
                                                Number(item.late) === 0
                                                    ? "success"
                                                    : "warning"
                                            }
                                            size="small"
                                            sx={{
                                                width: "100%"
                                            }}
                                        />

                                    </CardContent>

                                </Card>

                            </Grid>

                        ))

                    }

                </Grid>

            </CardContent>

        </Card>

    );

}