import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ExternalLink } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ocean-950 text-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Building2 className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">
                {t("brand")}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{t("tagline")}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
              {t("nav.properties")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/properties" className="hover:text-white transition-colors">{t("nav.properties")}</Link></li>
              <li><Link to="/properties?island=Sal" className="hover:text-white transition-colors">Sal</Link></li>
              <li><Link to="/properties?island=Boa+Vista" className="hover:text-white transition-colors">Boa Vista</Link></li>
              <li><Link to="/properties?island=Santiago" className="hover:text-white transition-colors">Santiago</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
              {t("footer.poweredBy")}
            </h3>
            <a
              href="https://www.africarealestateindex.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mb-2 text-sm text-white font-medium hover:text-emerald-400 transition-colors"
            >
              {t("footer.areiName")}
              <ExternalLink className="w-3.5 h-3.5 text-white/50" />
            </a>
            <p className="text-sm leading-relaxed">{t("footer.tagline")}</p>
            <Link
              to="/developers"
              className="inline-block mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {t("about.devLink")} →
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-xs text-center text-white/40">
          {t("footer.copyright", { year })}
        </div>
      </div>
    </footer>
  );
}
