import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        primary: {
            main: "#0F766E",
        },
        secondary: {
            main: "#14B8A6",
        },
        background: {
            default: "#F8FAFC",
        },
    },
    typography: {
        fontFamily: "Inter, sans-serif",
    },
    shape: {
        borderRadius: 12,
    },
});

export default theme;