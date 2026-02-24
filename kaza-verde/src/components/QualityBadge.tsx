import { useTranslation } from "react-i18next";
import { ImageOff, FileWarning, Clock } from "lucide-react";
import type { Listing } from "../types";

export type BadgeType = "noPhotos" | "fewPhotos" | "descriptionIncomplete" | "mayBeOutdated";

interface BadgeConfig {
  key: BadgeType;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  { key: "noPhotos", icon: ImageOff, color: "bg-red-50 text-red-600" },
  { key: "fewPhotos", icon: ImageOff, color: "bg-amber-50 text-amber-600" },
  { key: "descriptionIncomplete", icon: FileWarning, color: "bg-amber-50 text-amber-600" },
  { key: "mayBeOutdated", icon: Clock, color: "bg-gray-100 text-gray-500" },
];

const OUTDATED_DAYS = 60;
const MIN_DESCRIPTION_LENGTH = 150;
const MIN_GOOD_IMAGES = 3;

export function getListingBadges(listing: Listing): BadgeType[] {
  const badges: BadgeType[] = [];
  const imageCount = listing.image_urls?.length ?? 0;

  if (imageCount === 0) badges.push("noPhotos");
  else if (imageCount < MIN_GOOD_IMAGES) badges.push("fewPhotos");

  if (!listing.description || listing.description.length < MIN_DESCRIPTION_LENGTH) {
    badges.push("descriptionIncomplete");
  }

  if (listing.created_at) {
    const age = Date.now() - new Date(listing.created_at).getTime();
    if (age > OUTDATED_DAYS * 24 * 60 * 60 * 1000) badges.push("mayBeOutdated");
  }

  return badges;
}

export function QualityBadge({ type, size = "sm" }: { type: BadgeType; size?: "sm" | "md" }) {
  const { t } = useTranslation();
  const config = BADGE_CONFIGS.find((c) => c.key === type);
  if (!config) return null;

  const Icon = config.icon;
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium backdrop-blur-sm ${config.color} ${
        isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Icon className={isSm ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {t(`badges.${type}`)}
    </span>
  );
}

export function CardBadge({ listing }: { listing: Listing }) {
  const badges = getListingBadges(listing);
  if (badges.length === 0) return null;
  return (
    <div className="absolute top-2.5 left-2.5 z-10">
      <QualityBadge type={badges[0]} />
    </div>
  );
}

export function DetailBadges({ listing }: { listing: Listing }) {
  const badges = getListingBadges(listing);
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <QualityBadge key={b} type={b} size="md" />
      ))}
    </div>
  );
}
