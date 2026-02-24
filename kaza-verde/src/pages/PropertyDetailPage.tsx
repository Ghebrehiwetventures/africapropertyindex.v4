import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bed,
  Bath,
  Maximize,
  MapPin,
  ExternalLink,
  Database,
  LandPlot,
  Info,
} from "lucide-react";
import { useListing } from "../hooks/useListings";
import { formatPrice, sourceLabel, plural } from "../utils/format";
import { ImageGallery } from "../components/ImageGallery";
import { DetailBadges } from "../components/QualityBadge";

function daysAgo(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

export function PropertyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading, error } = useListing(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="w-10 h-10 border-[3px] border-ocean-200 border-t-ocean-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">?</span>
          </div>
          <p className="text-red-600 font-medium mb-4">{error?.message ?? "Property not found."}</p>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-700 hover:text-ocean-900"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("detail.backToListings")}
          </Link>
        </div>
      </div>
    );
  }

  const price = formatPrice(listing.price, listing.currency);
  const location = [listing.city, listing.island].filter(Boolean).join(", ");
  const age = listing.created_at ? daysAgo(listing.created_at) : null;

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link to="/" className="hover:text-ocean-700 transition-colors">{t("brand")}</Link>
            <span className="text-gray-200">/</span>
            <Link to="/properties" className="hover:text-ocean-700 transition-colors">
              {t("nav.properties")}
            </Link>
            {listing.island && (
              <>
                <span className="text-gray-200">/</span>
                <Link
                  to={`/properties?island=${encodeURIComponent(listing.island)}`}
                  className="hover:text-ocean-700 transition-colors"
                >
                  {listing.island}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Link
          to="/properties"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-ocean-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("detail.backToListings")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: images + description + amenities */}
          <div className="lg:col-span-3 space-y-6">
            <ImageGallery images={listing.image_urls ?? []} alt={listing.title ?? undefined} />

            {listing.description && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {t("detail.description")}
                </h2>
                <p className="text-gray-600 text-[15px] leading-[1.75] whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            {listing.amenities && listing.amenities.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {t("detail.amenities")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="px-3 py-1.5 bg-ocean-50 text-ocean-700 text-sm font-medium rounded-lg"
                    >
                      {amenity.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: details panel */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-4">
              {/* Main card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-xl font-bold text-gray-900 leading-snug">
                      {listing.title || "Property"}
                    </h1>
                    {listing.property_type && (
                      <span className="shrink-0 px-2.5 py-1 bg-ocean-50 text-ocean-700 text-xs font-semibold rounded-lg uppercase tracking-wide">
                        {listing.property_type}
                      </span>
                    )}
                  </div>

                  {location && (
                    <p className="flex items-center gap-1.5 text-gray-400 text-sm mt-2">
                      <MapPin className="w-4 h-4 shrink-0" />
                      {location}
                    </p>
                  )}

                  <DetailBadges listing={listing} />

                  <div className="mt-5 pt-5 border-t border-gray-50">
                    <p className="text-3xl font-extrabold text-ocean-800 tracking-tight">
                      {price ?? t("properties.priceOnRequest")}
                    </p>
                    {listing.price_period && (
                      <span className="text-sm text-gray-400 mt-0.5">/ {listing.price_period}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 border-t border-gray-50">
                  {listing.bedrooms != null && (
                    <DetailStat
                      icon={Bed}
                      value={listing.bedrooms}
                      label={plural(listing.bedrooms, t("properties.bed"), t("properties.beds"))}
                    />
                  )}
                  {listing.bathrooms != null && (
                    <DetailStat
                      icon={Bath}
                      value={listing.bathrooms}
                      label={plural(listing.bathrooms, t("properties.bath"), t("properties.baths"))}
                    />
                  )}
                  {listing.property_size_sqm != null && (
                    <DetailStat
                      icon={Maximize}
                      value={`${Math.round(listing.property_size_sqm)}`}
                      label="m²"
                    />
                  )}
                </div>

                {listing.land_area_sqm != null && (
                  <div className="px-6 py-3 border-t border-gray-50 flex items-center gap-2 text-sm text-gray-500">
                    <LandPlot className="w-4 h-4 text-gray-400" />
                    {t("detail.landArea")}: {Math.round(listing.land_area_sqm).toLocaleString()} m²
                  </div>
                )}

                {listing.source_url && (
                  <div className="p-4 border-t border-gray-50">
                    <a
                      href={listing.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-ocean-700 text-white font-semibold text-sm rounded-xl hover:bg-ocean-800 transition-colors shadow-md shadow-ocean-700/15"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t("detail.viewOriginal")}
                    </a>
                  </div>
                )}
              </div>

              {/* Source attribution */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 leading-snug">
                      {t("detail.dataSource", { source: sourceLabel(listing.source_id) })}
                    </p>
                    {age != null && (
                      <p className="text-[11px] text-gray-300">
                        {t("detail.lastUpdated", { days: age })}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-[11px] text-gray-300 leading-snug">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  {t("detail.aggregatedData", { source: sourceLabel(listing.source_id) })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
}) {
  return (
    <div className="text-center py-5 border-r border-gray-50 last:border-r-0">
      <Icon className="w-4 h-4 text-gray-300 mx-auto mb-1.5" />
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}
