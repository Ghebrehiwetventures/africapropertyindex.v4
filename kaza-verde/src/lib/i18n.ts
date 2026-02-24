import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import pt from "../locales/pt.json";

const savedLang = typeof window !== "undefined"
  ? localStorage.getItem("kaza-verde-lang") || "en"
  : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("kaza-verde-lang", lng);
  document.documentElement.lang = lng;
});

export default i18n;
