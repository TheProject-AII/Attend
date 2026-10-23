import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import id from "./locales/id.json";
import en from "./locales/en.json";

const savedLanguage = localStorage.getItem("aii_language");

i18n.use(initReactI18next).init({
    resources: {
        id: { translation: id },
        en: { translation: en },
    },

    // Default English
    lng: ["id", "en"].includes(savedLanguage)
        ? savedLanguage
        : "en",

    fallbackLng: "en",

    interpolation: {
        escapeValue: false,
    },
});

export default i18n;