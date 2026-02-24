import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ISLANDS } from "../utils/islands";

export function IslandSelector() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "en" | "pt";

  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            {t("islands.title")}
          </h2>
          <p className="mt-2 text-gray-500 max-w-xl mx-auto">
            {t("islands.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {ISLANDS.map((island) => (
            <Link
              key={island.name}
              to={`/properties?island=${encodeURIComponent(island.name)}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md hover:shadow-xl transition-all duration-300"
            >
              <img
                src={island.image}
                alt={island.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <h3 className="text-white font-bold text-lg tracking-tight">{island.name}</h3>
                <p className="text-white/60 text-xs mt-0.5 line-clamp-1">
                  {island.description[lang] ?? island.description.en}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
