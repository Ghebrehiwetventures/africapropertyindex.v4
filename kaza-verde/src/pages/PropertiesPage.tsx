import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, X } from "lucide-react";
import { useListings, useIslandOptions, PAGE_SIZE } from "../hooks/useListings";
import { PropertyCard } from "../components/PropertyCard";
import { FilterPanel, activeFilterCount } from "../components/FilterPanel";
import type { ListingsFilters } from "../types";

export function PropertiesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ListingsFilters>(() => ({
    island: searchParams.get("island") || undefined,
    priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : undefined,
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : undefined,
    bedrooms: searchParams.get("bedrooms") ? Number(searchParams.get("bedrooms")) : undefined,
    propertyType: searchParams.get("propertyType") || undefined,
    sort: (searchParams.get("sort") as ListingsFilters["sort"]) || "newest",
  }));

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.island) params.set("island", filters.island);
    if (filters.priceMin != null) params.set("priceMin", String(filters.priceMin));
    if (filters.priceMax != null) params.set("priceMax", String(filters.priceMax));
    if (filters.bedrooms != null) params.set("bedrooms", String(filters.bedrooms));
    if (filters.propertyType) params.set("propertyType", filters.propertyType);
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const { data, isLoading, error } = useListings(page, filters);
  const { data: islandOptions } = useIslandOptions();
  const listings = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const islandNames = islandOptions?.map((o) => o.island);

  const handleFilterChange = (f: ListingsFilters) => {
    setFilters(f);
    setPage(1);
  };

  const from = totalCount > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, totalCount);
  const filterCount = activeFilterCount(filters);

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {t("properties.title")}
              </h1>
              {totalCount > 0 && (
                <p className="mt-1.5 text-sm text-gray-400">
                  {t("properties.showing", { from, to, total: totalCount })}
                </p>
              )}
            </div>
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors relative"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("filters.title")}
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ocean-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {filterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8">
          {/* Desktop filters */}
          <aside className="hidden lg:block w-[280px] shrink-0">
            <div className="sticky top-24">
              <FilterPanel filters={filters} onChange={handleFilterChange} islandNames={islandNames} />
            </div>
          </aside>

          {/* Mobile filters overlay */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-[320px] max-w-[85vw] bg-[#f8f9fb] shadow-2xl overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white">
                  <h2 className="font-bold text-gray-900">{t("filters.title")}</h2>
                  <button onClick={() => setMobileFiltersOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5">
                  <FilterPanel filters={filters} onChange={(f) => { handleFilterChange(f); setMobileFiltersOpen(false); }} islandNames={islandNames} />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <main className="flex-1 min-w-0">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                {error.message}
              </div>
            )}

            {isLoading && (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-[3px] border-ocean-200 border-t-ocean-700 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-400">Loading properties…</p>
              </div>
            )}

            {!isLoading && listings.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <SlidersHorizontal className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">{t("properties.noResults")}</p>
              </div>
            )}

            {!isLoading && listings.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <PropertyCard key={listing.id} listing={listing} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="mt-10 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm disabled:opacity-30 hover:bg-gray-50 transition-colors"
                    >
                      {t("properties.previous")}
                    </button>
                    <span className="px-4 py-2.5 text-sm text-gray-400 font-medium">
                      {t("properties.page", { current: page, total: totalPages })}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm disabled:opacity-30 hover:bg-gray-50 transition-colors"
                    >
                      {t("properties.next")}
                    </button>
                  </nav>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
