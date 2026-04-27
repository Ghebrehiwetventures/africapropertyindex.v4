import { useEffect, useState } from "react";

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
  /** Called when the image fails to load (404, network error, decode fail).
   *  Parents typically use this to drop the surrounding card from the list,
   *  since KazaVerde's policy is "no image → not shown". */
  onFail?: () => void;
}

/* SmartImage — renders an <img> only when the URL exists AND loads.
   On error, it unmounts itself and fires onFail so the parent can react
   (usually by removing the card entirely). No visual placeholder. */
export default function SmartImage({
  src,
  alt = "",
  className,
  loading = "lazy",
  onFail,
}: Props) {
  const [failed, setFailed] = useState(false);

  // Reset failure state when the URL changes (e.g. gallery navigation).
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
      onError={() => {
        setFailed(true);
        onFail?.();
      }}
    />
  );
}
