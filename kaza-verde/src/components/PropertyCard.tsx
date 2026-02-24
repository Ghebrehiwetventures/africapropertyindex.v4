import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bed, Bath, Maximize, MapPin, Camera } from "lucide-react";
import type { Listing } from "../types";
import { formatPrice, sourceLabel, plural } from "../utils/format";
import { PropertyImage } from "./PropertyImage";
import { CardBadge } from "./QualityBadge";

interface Props {
  listing: Listing;
}

export function PropertyCard({ listing }: Props) {
  const { t } = useTranslation();
  const price = formatPrice(listing.price, listing.currency);
  const photoCount = listing.image_urls?.length ?? 0;

  return (
    <Link
      to={`/properties/${listing.id}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06),0_6px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
    >
      <div className="aspect-[16/11] overflow-hidden relative">
        <CardBadge listing={listing} />
        <PropertyImage
          src={listing.image_urls?.[0]}
          alt={listing.title ?? ""}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {photoCount > 1 && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-1 rounded-lg">
            <Camera className="w-3 h-3" />
            {photoCount}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[22px] font-bold text-gray-900 leading-tight">
          {price ?? t("properties.priceOnRequest")}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-500">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-gray-400" />
              {listing.bedrooms} {plural(listing.bedrooms, t("properties.bed"), t("properties.beds"))}
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5 text-gray-400" />
              {listing.bathrooms} {plural(listing.bathrooms, t("properties.bath"), t("properties.baths"))}
            </span>
          )}
          {listing.property_size_sqm != null && (
            <span className="flex items-center gap-1">
              <Maximize className="w-3.5 h-3.5 text-gray-400" />
              {Math.round(listing.property_size_sqm)} m²
            </span>
          )}
        </div>

        <h3 className="mt-2.5 font-medium text-gray-700 text-sm leading-snug line-clamp-2 min-h-[2.5em]">
          {listing.title || "Untitled"}
        </h3>

        {(listing.island || listing.city) && (
          <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="w-3 h-3 shrink-0" />
            {[listing.city, listing.island].filter(Boolean).join(", ")}
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-gray-50">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            {sourceLabel(listing.source_id)}
          </span>
        </div>
      </div>
    </Link>
  );
}
