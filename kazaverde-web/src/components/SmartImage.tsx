import { useEffect, useState } from "react";

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
}

/* SmartImage — renders <img> only when the URL exists AND loads.
   On 404/network-error, the img unmounts so the parent's CSS background
   (typically a placeholder gradient or off-white) shows through.

   Why this exists: the pipeline currently stores image URLs from sources
   that no longer serve them (e.g. Terra Cabo Verde returns 404 on its
   own image paths). CSS `background-image` cannot signal load-failure,
   which is why those rows rendered as empty cards. With <img onError>,
   we can detect the failure and fall back gracefully. */
export default function SmartImage({
  src,
  alt = "",
  className,
  loading = "lazy",
}: Props) {
  const [failed, setFailed] = useState(false);

  // Reset failure state when src changes (e.g. gallery navigation).
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
