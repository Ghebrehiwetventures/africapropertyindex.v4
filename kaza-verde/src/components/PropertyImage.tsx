import { useState, useCallback } from "react";
import { Home } from "lucide-react";

const BAD_URL_PATTERNS = [
  "placeholder",
  "logo",
  "watermark",
  "default",
  "no-image",
  "noimage",
  "coming-soon",
  "coming_soon",
];

export function isBadImageUrl(url: string | undefined): boolean {
  if (!url) return true;
  const lower = url.trim().toLowerCase();
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) return true;
  return BAD_URL_PATTERNS.some((p) => lower.includes(p));
}

export function sanitizeImageUrls(urls: string[]): string[] {
  return urls.filter((u) => !isBadImageUrl(u));
}

function proxyUrl(src: string): string {
  return `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=800&q=80&default=1`;
}

interface Props {
  src: string | undefined;
  alt?: string;
  className?: string;
  sizes?: string;
}

export function PropertyImage({ src, alt = "", className = "", sizes }: Props) {
  const [stage, setStage] = useState<"original" | "proxy" | "failed">("original");

  const handleError = useCallback(() => {
    setStage((prev) => {
      if (prev === "original" && src) return "proxy";
      return "failed";
    });
  }, [src]);

  if (!src || isBadImageUrl(src) || stage === "failed") {
    return (
      <div
        className={`bg-gradient-to-br from-ocean-50 to-ocean-100 flex flex-col items-center justify-center gap-2 ${className}`}
      >
        <Home className="w-8 h-8 text-ocean-300" />
        <span className="text-[11px] font-medium text-ocean-300 tracking-wide uppercase">
          No photo
        </span>
      </div>
    );
  }

  const activeSrc = stage === "proxy" ? proxyUrl(src) : src;

  return (
    <img
      src={activeSrc}
      alt={alt}
      className={className}
      loading="lazy"
      sizes={sizes}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
