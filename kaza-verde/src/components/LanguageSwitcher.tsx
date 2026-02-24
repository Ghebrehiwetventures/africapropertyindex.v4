import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/10 p-0.5">
      <button
        onClick={() => i18n.changeLanguage("en")}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
          current === "en"
            ? "bg-white text-ocean-900 shadow-sm"
            : "text-white/70 hover:text-white"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => i18n.changeLanguage("pt")}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
          current === "pt"
            ? "bg-white text-ocean-900 shadow-sm"
            : "text-white/70 hover:text-white"
        }`}
      >
        PT
      </button>
    </div>
  );
}
