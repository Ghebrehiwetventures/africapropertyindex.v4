import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Menu, X } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_ITEMS = [
  { path: "/", labelKey: "nav.home" },
  { path: "/properties", labelKey: "nav.properties" },
  { path: "/about", labelKey: "nav.about" },
  { path: "/developers", labelKey: "nav.developers" },
] as const;

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-ocean-950/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[60px]">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-[17px] font-bold text-white tracking-tight">
              {t("brand")}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map(({ path, labelKey }) => {
              const active = path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-white/12 text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {t(labelKey)}
                </Link>
              );
            })}
            <div className="ml-4 pl-4 border-l border-white/10">
              <LanguageSwitcher />
            </div>
          </nav>

          <button
            className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-ocean-950 pb-5">
          <nav className="px-4 pt-3 space-y-0.5">
            {NAV_ITEMS.map(({ path, labelKey }) => {
              const active = path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/12 text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {t(labelKey)}
                </Link>
              );
            })}
          </nav>
          <div className="px-7 pt-4">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
