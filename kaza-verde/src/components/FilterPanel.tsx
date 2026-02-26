import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { ISLAND_NAMES } from "../utils/islands";
import type { ListingsFilters } from "../types";

interface Props {
  filters: ListingsFilters;
  onChange: (filters: ListingsFilters) => void;
  /** Island names for dropdown (from arei.getIslandOptions); falls back to ISLAND_NAMES */
  islandNames?: string[];
}

const PROPERTY_TYPES = ["Apartment", "Villa", "House", "Land", "Commercial", "Studio"];

export function FilterPanel({ filters, onChange, islandNames }: Props) {
  const { t } = useTranslation();
  const names = islandNames ?? ISLAND_NAMES;

  const hasFilters =
    filters.island ||
    filters.priceMin != null ||
    filters.priceMax != null ||
    filters.bedrooms != null ||
    filters.propertyType;

  const update = (patch: Partial<ListingsFilters>) => {
    onChange({ ...filters, ...patch });
  };

  const clearAll = () => {
    onChange({ sort: filters.sort });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-gray-900">{t("filters.title")}</h2>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs font-medium text-ocean-600 hover:text-ocean-800 transition-colors"
          >
            <X className="w-3 h-3" />
            {t("filters.clearAll")}
          </button>
        )}
      </div>

      <div className="space-y-5">
        {/* Island */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {t("filters.island")}
          </label>
          <select
            value={filters.island ?? ""}
            onChange={(e) => update({ island: e.target.value || undefined })}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 outline-none transition"
          >
            <option value="">{t("filters.allIslands")}</option>
            {names.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Property type */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {t("filters.propertyType")}
          </label>
          <select
            value={filters.propertyType ?? ""}
            onChange={(e) => update({ propertyType: e.target.value || undefined })}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 outline-none transition"
          >
            <option value="">{t("filters.allTypes")}</option>
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt} value={pt}>{pt}</option>
            ))}
          </select>
        </div>

        {/* Price range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("filters.priceMin")}
            </label>
            <input
              type="number"
              value={filters.priceMin ?? ""}
              onChange={(e) => update({ priceMin: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("filters.priceMax")}
            </label>
            <input
              type="number"
              value={filters.priceMax ?? ""}
              onChange={(e) => update({ priceMax: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="∞"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 outline-none transition"
            />
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {t("filters.bedrooms")}
          </label>
          <div className="flex gap-1.5">
            {[null, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n ?? "any"}
                onClick={() => update({ bedrooms: n ?? undefined })}
                className={`flex-1 py-2.5 text-sm rounded-xl font-semibold border transition-all ${
                  (filters.bedrooms ?? null) === n
                    ? "bg-ocean-700 text-white border-ocean-700 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-ocean-300 hover:text-ocean-700"
                }`}
              >
                {n == null ? t("filters.any") : `${n}+`}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {t("filters.sort")}
          </label>
          <select
            value={filters.sort ?? "newest"}
            onChange={(e) => update({ sort: e.target.value as ListingsFilters["sort"] })}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 outline-none transition"
          >
            <option value="newest">{t("filters.sortNewest")}</option>
            <option value="price_asc">{t("filters.sortPriceLow")}</option>
            <option value="price_desc">{t("filters.sortPriceHigh")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function activeFilterCount(filters: ListingsFilters): number {
  let count = 0;
  if (filters.island) count++;
  if (filters.priceMin != null) count++;
  if (filters.priceMax != null) count++;
  if (filters.bedrooms != null) count++;
  if (filters.propertyType) count++;
  return count;
}
