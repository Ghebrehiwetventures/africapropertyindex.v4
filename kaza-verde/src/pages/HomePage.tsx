import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ArrowRight, Building2, Globe, Shield, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useFeatured, useStats, useQualityRatio } from "../hooks/useListings";
// useQualityRatio is retained for internal/B2B use (e.g. /developers).
// Only the `quality` count is shown publicly; raw/ratio are hidden.
import { PropertyCard } from "../components/PropertyCard";
import { IslandSelector } from "../components/IslandSelector";

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: featured } = useFeatured();
  const { data: stats } = useStats();
  const { data: qr } = useQualityRatio();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const island = search.trim();
    if (island) {
      navigate(`/properties?island=${encodeURIComponent(island)}`);
    } else {
      navigate("/properties");
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ocean-950">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ocean-950/40 via-ocean-950/70 to-ocean-950" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-28 sm:pt-28 sm:pb-36">
          <div className="max-w-2xl">
            <p className="text-emerald-400 font-semibold text-sm tracking-wide uppercase mb-4">
              Cape Verde Real Estate
            </p>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              {t("hero.title")}
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-white/60 leading-relaxed max-w-lg">
              {t("hero.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSearch} className="mt-10 max-w-xl">
            <div className="flex bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden ring-1 ring-white/10">
              <div className="flex-1 flex items-center px-5">
                <Search className="w-5 h-5 text-gray-300 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("hero.searchPlaceholder")}
                  className="flex-1 px-3 py-4.5 text-[15px] text-gray-800 outline-none placeholder:text-gray-400 bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-4.5 bg-ocean-700 text-white font-semibold text-sm hover:bg-ocean-800 transition-colors shrink-0"
              >
                {t("hero.cta")}
              </button>
            </div>
          </form>

          {(stats || qr) && (
            <div className="mt-12 flex flex-wrap gap-8 sm:gap-12">
              {qr && qr.quality > 0 && (
                <StatPill value={qr.quality} label={t("stats.qualityChecked")} />
              )}
              {stats && <StatPill value={stats.totalIslands} label={t("stats.islands")} />}
              {stats && <StatPill value={stats.totalSources} label={t("stats.sources")} />}
            </div>
          )}
        </div>
      </section>

      {/* Islands */}
      <IslandSelector />

      {/* Featured listings */}
      {featured && featured.length > 0 && (
        <section className="bg-gray-50/80 py-20 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                  {t("featured.title")}
                </h2>
                <p className="mt-1.5 text-gray-500">
                  {t("hero.subtitle")}
                </p>
              </div>
              <Link
                to="/properties"
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-ocean-700 hover:text-ocean-900 transition-colors"
              >
                {t("featured.viewAll")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.slice(0, 8).map((listing) => (
                <PropertyCard key={listing.id} listing={listing} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link
                to="/properties"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-700"
              >
                {t("featured.viewAll")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Data quality banner */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-emerald-600 font-semibold text-sm tracking-wide uppercase mb-2">
              {t("footer.poweredBy")} {t("footer.areiName")}
            </p>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              {t("developers.features")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <QualityCard icon={Building2} title={t("developers.feature1Title")} text={t("developers.feature1Text")} />
            <QualityCard icon={Shield} title={t("developers.feature2Title")} text={t("developers.feature2Text")} />
            <QualityCard icon={RefreshCw} title={t("developers.feature3Title")} text={t("developers.feature3Text")} />
            <QualityCard icon={Globe} title={t("developers.feature4Title")} text={t("developers.feature4Text")} />
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/developers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-ocean-700 text-white font-semibold text-sm rounded-xl hover:bg-ocean-800 transition-colors shadow-lg shadow-ocean-700/20"
            >
              {t("about.devLink")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatPill({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-white">{value}</span>
      <span className="text-sm text-white/40 font-medium">{label}</span>
    </div>
  );
}

function QualityCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-ocean-50 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-ocean-600" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
    </div>
  );
}
