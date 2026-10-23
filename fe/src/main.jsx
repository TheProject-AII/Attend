import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import theme from "./config/theme";
import { registerSW } from "virtual:pwa-register";
import "./i18n";
registerSW({
    immediate: true,
});

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <AuthProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App />
            </ThemeProvider>
        </AuthProvider>
    </React.StrictMode>
);