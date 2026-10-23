import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        primary: {
            main: "#0F766E",
        },
        secondary: {
            main: "#F59E0B",
        },
        background: {
            default: "#F5F7FA",
            paper: "#FFFFFF",
        },
        text: {
            primary: "#1F2937",
            secondary: "#6B7280",
        },
    },

    shape: {
        borderRadius: 14,
    },

    typography: {
        fontFamily: "Inter, sans-serif",

        h4: {
            fontWeight: 700,
        },

        h5: {
            fontWeight: 600,
        },

        button: {
            textTransform: "none",
            fontWeight: 600,
        },
    },
});

export default theme;