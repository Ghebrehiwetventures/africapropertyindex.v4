import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { sanitizeImageUrls } from "./PropertyImage";

interface Props {
  images: string[];
  alt?: string;
}

function proxyUrl(src: string): string {
  return `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=1200&q=85&default=1`;
}

export function ImageGallery({ images, alt }: Props) {
  const { t } = useTranslation();
  const cleanImages = useMemo(() => sanitizeImageUrls(images), [images]);
  const [index, setIndex] = useState(0);
  const [failedSet, setFailedSet] = useState<Set<number>>(new Set());
  const [proxySet, setProxySet] = useState<Set<number>>(new Set());
  const hasMultiple = cleanImages.length > 1;

  const handleError = useCallback((i: number) => {
    if (!proxySet.has(i) && !failedSet.has(i)) {
      setProxySet((prev) => new Set(prev).add(i));
    } else {
      setFailedSet((prev) => new Set(prev).add(i));
    }
  }, [proxySet, failedSet]);

  if (cleanImages.length === 0) {
    return (
      <div className="aspect-[16/10] bg-gradient-to-br from-ocean-50 to-ocean-100 rounded-2xl flex flex-col items-center justify-center gap-2">
        <Home className="w-12 h-12 text-ocean-200" />
        <span className="text-sm font-medium text-ocean-300">No photos available</span>
      </div>
    );
  }

  const prev = () => setIndex((i) => (i - 1 + cleanImages.length) % cleanImages.length);
  const next = () => setIndex((i) => (i + 1) % cleanImages.length);

  const getSrc = (i: number) => (proxySet.has(i) ? proxyUrl(cleanImages[i]) : cleanImages[i]);

  const availableCount = cleanImages.length - failedSet.size;

  return (
    <div className="space-y-3">
      <div className="relative group rounded-2xl overflow-hidden">
        <div className="aspect-[16/10] bg-gray-100">
          {failedSet.has(index) ? (
            <div className="w-full h-full bg-gradient-to-br from-ocean-50 to-ocean-100 flex flex-col items-center justify-center gap-2">
              <Home className="w-12 h-12 text-ocean-200" />
              <span className="text-sm font-medium text-ocean-300">Photo unavailable</span>
            </div>
          ) : (
            <img
              src={getSrc(index)}
              alt={alt ?? ""}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => handleError(index)}
            />
          )}
        </div>

        {hasMultiple && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white hover:scale-105"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white hover:scale-105"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">
              {failedSet.size > 0
                ? `${index + 1} / ${cleanImages.length} (${availableCount} available)`
                : t("detail.gallery", { current: index + 1, total: cleanImages.length })}
            </div>
          </>
        )}
      </div>

      {hasMultiple && cleanImages.length <= 12 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {cleanImages.map((_src, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`flex-shrink-0 w-[72px] h-[50px] rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                i === index
                  ? "border-ocean-600 shadow-sm"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              {failedSet.has(i) ? (
                <div className="w-full h-full bg-ocean-50 flex items-center justify-center">
                  <Home className="w-4 h-4 text-ocean-200" />
                </div>
              ) : (
                <img
                  src={getSrc(i)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => handleError(i)}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
