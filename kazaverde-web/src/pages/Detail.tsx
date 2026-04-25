import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { arei } from "../lib/arei";
import type {
  ListingDetail as ListingDetailType,
  ListingCard,
  IslandContext,
} from "arei-sdk";
import {
  formatPrice,
  formatLocation,
  formatSourceLabel,
  formatMedian,
  formatPricePerSqm,
} from "../lib/format";
import { looksItalian, stripHtml, translateItalianToEnglish } from "../lib/translation";
import { calcMortgage, type MortgageInput } from "../lib/calcMortgage";
import NotFound from "./NotFound";
import "./Detail.css";

/** Collapse WP size variants (-1024x768.jpg) into one image per base filename, keeping the largest. */
function dedupeWpImages(urls: string[]): string[] {
  const unique = [...new Set(urls)];
  const groups = new Map<string, { url: string; area: number; order: number }>();
  for (let i = 0; i < unique.length; i++) {
    const url = unique[i];
    const base = url.replace(/-\d{2,5}x\d{2,5}(\.\w+)$/, "$1");
    const m = url.match(/-(\d{2,5})x(\d{2,5})\.\w+$/);
    const area = m ? Number(m[1]) * Number(m[2]) : Infinity;
    const existing = groups.get(base);
    if (!existing) {
      groups.set(base, { url, area, order: i });
    } else if (area > existing.area) {
      groups.set(base, { url, area, order: existing.order });
    }
  }
  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order)
    .map((g) => g.url);
}

function toTitleCase(str: string): string {
  if (str !== str.toUpperCase()) return str;
  return str.toLowerCase().replace(/(?:^|\s|[-/])\S/g, (c) => c.toUpperCase());
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return "recently";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "recently";
  const days = Math.max(0, Math.round((Date.now() - t) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase() +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

/** Extract a short slug from source_id (e.g. "cv_gabetticasecapoverde:CV-TER339" → "TCV") */
function sourceSlug(sourceId: string): string {
  const before = sourceId.split(":")[0] || sourceId;
  // Take letters from after first underscore, uppercased, first 3-4 chars
  const after = before.split("_").slice(1).join("");
  if (after) return after.slice(0, 3).toUpperCase();
  return before.slice(0, 3).toUpperCase();
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ListingDetailType | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [similar, setSimilar] = useState<ListingCard[]>([]);
  const [marketCtx, setMarketCtx] = useState<IslandContext | null>(null);

  const displayTitle = detail ? toTitleCase(detail.title) : "Property";

  useDocumentMeta(
    detail ? displayTitle : error ? "Property not found" : "Property",
    detail
      ? `${displayTitle} in ${detail.city ? `${detail.city}, ` : ""}${detail.island}, Cape Verde.`
      : "Property listing in Cape Verde",
    images[0] ? { image: images[0] } : undefined
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    arei
      .getListing(id)
      .then((d) => {
        if (cancelled) return;
        if (!d) {
          setError("Property not found.");
          setDetail(null);
          return;
        }
        setDetail(d);
        setImages(dedupeWpImages(d.image_urls ?? []));
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load property.");
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const source = detail?.description_html
      ? stripHtml(detail.description_html)
      : detail?.description ?? "";
    if (!source || !looksItalian(source)) {
      setTranslatedDescription(null);
      return () => {
        cancelled = true;
      };
    }
    translateItalianToEnglish(source).then((t) => {
      if (!cancelled) setTranslatedDescription(t);
    });
    return () => {
      cancelled = true;
    };
  }, [detail?.description, detail?.description_html]);

  // Similar properties — fetch up to 9 so user can scroll through
  useEffect(() => {
    if (!detail) {
      setSimilar([]);
      return;
    }
    let cancelled = false;
    arei
      .getSimilarListings({ listing: detail, limit: 9 })
      .then((cards) => {
        if (!cancelled) setSimilar(cards);
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  // Market context
  useEffect(() => {
    if (!detail) {
      setMarketCtx(null);
      return;
    }
    let cancelled = false;
    arei
      .getIslandContext(detail.island, detail.price)
      .then((c) => {
        if (!cancelled) setMarketCtx(c);
      })
      .catch(() => {
        if (!cancelled) setMarketCtx(null);
      });
    return () => {
      cancelled = true;
    };
  }, [detail?.island, detail?.price]);

  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    setGalleryIndex(0);
  }, [detail?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxOpen) {
        setLightboxOpen(false);
        return;
      }
      if (!hasMultipleImages) return;
      if (e.key === "ArrowLeft") setGalleryIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
      if (e.key === "ArrowRight") setGalleryIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMultipleImages, images.length, lightboxOpen]);

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [lightboxOpen]);

  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) goPrev();
    else if (delta < -50) goNext();
  };

  const goPrev = () => setGalleryIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  const goNext = () => setGalleryIndex((i) => (i >= images.length - 1 ? 0 : i + 1));

  if (loading) {
    return (
      <div className="kv-d">
        <div className="kv-d-topbar">
          <button type="button" className="kv-d-back" onClick={() => navigate("/")}>← All listings</button>
        </div>
        <div className="kv-empty"><strong>Loading…</strong></div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <NotFound
        title="Property not found"
        message="This listing may have been removed or the link is no longer valid."
      />
    );
  }

  const interiorArea = detail.property_size_sqm;
  const landArea = detail.land_area_sqm;
  const effectiveArea = interiorArea || landArea;
  const pricePerSqm =
    detail.price && effectiveArea ? Math.round(detail.price / effectiveArea) : null;

  const isLand = (detail.property_type || "").toLowerCase() === "land";

  // Build facts strip: Type / Bedrooms / Bathrooms / Interior / Price per m²
  // For land: Type / Land / Price per m² (bed/bath omitted as "—")
  const typeLabel = detail.property_type ? capitalize(detail.property_type) : "—";

  return (
    <div className="kv-d">
      {/* Breadcrumb: Listings / Island / City — no internal id, the page
          title carries the listing identity. */}
      <div className="kv-d-crumb">
        <Link to="/">Listings</Link>
        <span className="kv-d-crumb-sep">/</span>
        <Link to={`/?island=${encodeURIComponent(detail.island)}`}>{detail.island}</Link>
        {detail.city && (
          <>
            <span className="kv-d-crumb-sep">/</span>
            <span className="kv-d-crumb-cur">{detail.city}</span>
          </>
        )}
      </div>

      {/* Top meta rail: 3-row grid — eyebrow / title+price / subline+€per-m². */}
      <header className="kv-d-top">
        <div className="kv-d-top-grid">
          <div className="kv-d-eyebrow">
            <span className={`kv-d-tag${detail.is_new ? " kv-d-tag-new" : ""}`}>
              {detail.is_new ? "New" : "Indexed"}
            </span>
            {detail.property_type && <b>{typeLabel}</b>}
            <span className="kv-d-eyebrow-dot" aria-hidden="true" />
            <span>{formatLocation(detail.city, detail.island)}</span>
            <span className="kv-d-eyebrow-dot" aria-hidden="true" />
            <span>{formatSourceLabel(detail.source_id)}</span>
          </div>
          <h1 className="kv-d-title">{displayTitle}</h1>
          <div className="kv-d-price-block">
            <div className="kv-d-price">{formatPrice(detail.price, detail.currency)}</div>
          </div>
          <div className="kv-d-subline">
            {!isLand && detail.bedrooms != null && (
              <>
                <b>{detail.bedrooms === 0 ? "Studio" : detail.bedrooms}</b> bed
              </>
            )}
            {!isLand && detail.bathrooms != null && detail.bathrooms > 0 && (
              <>
                {" · "}
                <b>{detail.bathrooms}</b> bath
              </>
            )}
            {effectiveArea != null && (
              <>
                {" · "}
                <b>{effectiveArea.toLocaleString()}</b> m²
              </>
            )}
          </div>
          {/* Always rendered to reserve vertical space; empty when €/m² unknown.
              Format mirrors listing-v1.html .ppm: bold value + " per m²". */}
          <div className="kv-d-price-cve">
            {pricePerSqm ? <><b>€{pricePerSqm.toLocaleString()}</b> per m²</> : ""}
          </div>
        </div>
      </header>

      {/* Gallery — mosaic if ≥5 images, else single hero */}
      {images.length >= 5 ? (
        <GalleryMosaic
          images={images}
          isNew={detail.is_new}
          onOpen={(i) => {
            setGalleryIndex(i);
            setLightboxOpen(true);
          }}
        />
      ) : (
        <div
          className="kv-d-hero"
          onClick={() => images.length > 0 && setLightboxOpen(true)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="kv-d-hero-img"
            style={
              images.length > 0
                ? {
                    backgroundImage: `url(${images[galleryIndex]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { background: "linear-gradient(135deg, #c9d4c8 0%, #a8bea4 100%)" }
            }
          />
          {detail.is_new && <span className="kv-d-flag">New</span>}
          {hasMultipleImages && (
            <>
              <button
                type="button"
                className="kv-d-arrow kv-d-arrow-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                className="kv-d-arrow kv-d-arrow-next"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Next image"
              >
                ›
              </button>
              <div className="kv-d-counter">
                {galleryIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Facts strip — editorial 5-col between black rules */}
      <div className="kv-d-facts">
        <div className="kv-d-fact">
          <div className="kv-d-fact-k">Type</div>
          <div className="kv-d-fact-v">{typeLabel}</div>
        </div>
        <div className="kv-d-fact">
          <div className="kv-d-fact-k">Bedrooms</div>
          <div className="kv-d-fact-v">
            {isLand || detail.bedrooms == null
              ? "—"
              : detail.bedrooms === 0
                ? "Studio"
                : detail.bedrooms}
          </div>
        </div>
        <div className="kv-d-fact">
          <div className="kv-d-fact-k">Bathrooms</div>
          <div className="kv-d-fact-v">
            {isLand || detail.bathrooms == null || detail.bathrooms === 0 ? "—" : detail.bathrooms}
          </div>
        </div>
        <div className="kv-d-fact">
          <div className="kv-d-fact-k">{isLand ? "Land" : "Interior"}</div>
          <div className="kv-d-fact-v">
            {effectiveArea != null ? (
              <>
                {effectiveArea.toLocaleString()}
                <small>m²</small>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
        <div className="kv-d-fact">
          <div className="kv-d-fact-k">Price / m²</div>
          <div className="kv-d-fact-v">{pricePerSqm ? `€${pricePerSqm.toLocaleString()}` : "—"}</div>
        </div>
      </div>

      {/* Main 2-col: description + INDEX RECORD sidebar */}
      <div className="kv-d-main">
        <div>
          {/* Description */}
          <div className="kv-d-block">
            <h2 className="kv-d-block-h">Description</h2>
            {translatedDescription ? (
              <p>{translatedDescription}</p>
            ) : detail.description_html ? (
              <div className="kv-d-html" dangerouslySetInnerHTML={{ __html: detail.description_html }} />
            ) : detail.description ? (
              <p>{detail.description}</p>
            ) : (
              <p>
                This property is located in {formatLocation(detail.city, detail.island)}, Cape Verde.
              </p>
            )}
          </div>

          {/* Location was rendered here; removed because the breadcrumb and
              top meta rail already surface island/city/country. Will return
              as a proper map card once we have lat/lng. */}
        </div>

        {/* INDEX RECORD sidebar — info hierarchy mirrors the kazaverde
            buyer-facing sidebar: price (prominent) → who's listing it →
            attestation dates → CTA → "how we index" disclosure. */}
        <aside className="kv-d-aside">
          <div className="kv-d-card">
            <div className="kv-d-card-h">
              <span>Index record</span>
            </div>
            <div className="kv-d-card-body">
              {detail.price && (
                <div className="kv-d-card-price-block">
                  <div className="kv-d-card-price">
                    {formatPrice(detail.price, detail.currency)}
                  </div>
                  {detail.currency !== "CVE" && (
                    <div className="kv-d-card-price-cve">
                      Approx. {Math.round(detail.price * 110.265).toLocaleString("en-US")} CVE
                    </div>
                  )}
                </div>
              )}

              <div className="kv-d-card-listedby">
                Listed by <b>{formatSourceLabel(detail.source_id)}</b>
              </div>

              <div className="kv-d-prov">
                <div className="kv-d-prov-cell">
                  <div className="kv-d-prov-k">First seen</div>
                  <div className="kv-d-prov-v kv-d-prov-mono">{fmtShortDate(detail.first_seen_at)}</div>
                </div>
                <div className="kv-d-prov-cell">
                  <div className="kv-d-prov-k">Last indexed</div>
                  <div className="kv-d-prov-v kv-d-prov-mono">{fmtDateTime(detail.last_seen_at)}</div>
                </div>
              </div>

              {detail.source_url && (
                <a
                  className="kv-d-btn-primary"
                  href={detail.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on {formatSourceLabel(detail.source_id)} ↗
                </a>
              )}
            </div>
            <div className="kv-d-method">
              <b>How we index.</b> This record is aggregated from a public listing. KazaVerde does
              not broker, negotiate, or handle transactions — to enquire, visit the original source.
            </div>
          </div>
        </aside>
      </div>

      {/* Monthly Cost */}
      {detail.price && !isLand && <KvMortgage price={detail.price} />}

      {/* Market Context */}
      {marketCtx && <KvMarketContext ctx={marketCtx} island={detail.island} />}

      {/* Similar Properties */}
      {similar.length > 0 && <KvSimilar cards={similar} />}

      {/* Lightbox */}
      {lightboxOpen &&
        images.length > 0 &&
        createPortal(
          <div
            className="kv-d-lb"
            onClick={() => setLightboxOpen(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button className="kv-d-lb-close" onClick={() => setLightboxOpen(false)} aria-label="Close">
              ×
            </button>
            {hasMultipleImages && (
              <>
                <button
                  className="kv-d-lb-arrow kv-d-lb-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  className="kv-d-lb-arrow kv-d-lb-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
            <img
              className="kv-d-lb-img"
              src={images[galleryIndex]}
              alt={`Photo ${galleryIndex + 1} of ${images.length}`}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="kv-d-lb-counter">
              {galleryIndex + 1} / {images.length}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Gallery mosaic — 2fr 1fr 1fr with primary spanning 2 rows
──────────────────────────────────────────────────────────── */

function GalleryMosaic({
  images,
  isNew,
  onOpen,
}: {
  images: string[];
  isNew: boolean;
  onOpen: (index: number) => void;
}) {
  // Show 5 tiles: primary (idx 0) + 4 smaller tiles
  const tiles = images.slice(0, 5);
  const extraCount = Math.max(0, images.length - 5);

  return (
    <div className="kv-d-gallery">
      {tiles.map((url, i) => {
        const isPrimary = i === 0;
        const isLast = i === tiles.length - 1;
        return (
          <div
            key={url + i}
            className={`kv-d-gtile${isPrimary ? " kv-d-gtile-primary" : ""}`}
            style={{ backgroundImage: `url(${url})` }}
            onClick={() => onOpen(i)}
            role="button"
            tabIndex={0}
          >
            {isPrimary && isNew && <span className="kv-d-g-flag">New</span>}
            {isPrimary && !isNew && <span className="kv-d-g-flag">Primary</span>}
            {isLast && extraCount > 0 && (
              <span className="kv-d-g-count">+{extraCount} images</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Monthly Cost Estimate
──────────────────────────────────────────────────────────── */

function fmtEur(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function parseNum(raw: string, allowDecimal = false): number {
  const cleaned = allowDecimal
    ? raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    : raw.replace(/[^0-9]/g, "");
  return cleaned === "" ? 0 : Number(cleaned);
}

function KvMortgage({ price }: { price: number }) {
  const [input, setInput] = useState<MortgageInput>({
    totalAmount: price,
    downPaymentPct: 20,
    interestRate: 4.5,
    loanTermYears: 25,
    propertyTaxPct: 0.3,
    insuranceAnnual: 600,
    hoaMonthly: 0,
    maintenanceMonthly: 50,
    utilitiesMonthly: 0,
  });

  const [rawInterestRate, setRawInterestRate] = useState(String(input.interestRate));
  const set = <K extends keyof MortgageInput>(key: K, val: MortgageInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: val }));

  const result = useMemo(() => calcMortgage(input), [input]);

  const totalInterest = Math.max(0, result.monthlyMortgage * input.loanTermYears * 12 - result.loanAmount);
  const totalCost = result.downPayment + result.loanAmount + totalInterest;

  const rows: { label: string; value: number }[] = [
    { label: "Loan payment", value: result.monthlyMortgage },
    { label: "Property tax", value: result.monthlyTax },
    { label: "Insurance", value: result.monthlyInsurance },
    { label: "Condo fee", value: result.monthlyHoa },
    { label: "Maintenance", value: result.monthlyMaintenance },
    { label: "Utilities", value: result.monthlyUtilities },
  ].filter((r) => r.value > 0);

  return (
    <section className="kv-d-section">
      <div className="kv-d-section-head">
        <div>
          <div className="kv-d-ey">Estimate</div>
          <h2 className="kv-d-h2">Monthly cost</h2>
        </div>
      </div>

      <div className="kv-d-mc">
        <div className="kv-d-mc-inputs">
          {/* Loan terms — primary inputs */}
          <div className="kv-d-mc-field kv-d-mc-field-wide">
            <label>Property price</label>
            <input
              type="text"
              inputMode="numeric"
              value={input.totalAmount || ""}
              onChange={(e) => set("totalAmount", parseNum(e.target.value))}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Deposit ({input.downPaymentPct}%)</label>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={input.downPaymentPct}
              onChange={(e) => set("downPaymentPct", Number(e.target.value))}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Loan term ({input.loanTermYears}y)</label>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={input.loanTermYears}
              onChange={(e) => set("loanTermYears", Number(e.target.value))}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Interest rate (%)</label>
            <input
              type="text"
              inputMode="decimal"
              value={rawInterestRate}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                setRawInterestRate(raw);
                const n = raw === "" || raw === "." ? 0 : Number(raw);
                if (!isNaN(n)) set("interestRate", Math.min(15, n));
              }}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Property tax (%)</label>
            <input
              type="text"
              inputMode="decimal"
              value={input.propertyTaxPct}
              onChange={(e) => set("propertyTaxPct", parseNum(e.target.value, true))}
            />
          </div>

          {/* Carrying costs */}
          <div className="kv-d-mc-field">
            <label>Insurance (€/yr)</label>
            <input
              type="text"
              inputMode="numeric"
              value={input.insuranceAnnual || ""}
              onChange={(e) => set("insuranceAnnual", parseNum(e.target.value))}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Condo fee (€/mo)</label>
            <input
              type="text"
              inputMode="numeric"
              value={input.hoaMonthly || ""}
              onChange={(e) => set("hoaMonthly", parseNum(e.target.value))}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Maintenance (€/mo)</label>
            <input
              type="text"
              inputMode="numeric"
              value={input.maintenanceMonthly || ""}
              onChange={(e) => set("maintenanceMonthly", parseNum(e.target.value))}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Utilities (€/mo)</label>
            <input
              type="text"
              inputMode="numeric"
              value={input.utilitiesMonthly || ""}
              onChange={(e) => set("utilitiesMonthly", parseNum(e.target.value))}
            />
          </div>
        </div>

        <div className="kv-d-mc-result">
          <div className="kv-d-mc-hero">
            <div className="kv-d-mc-hero-label">Estimated monthly</div>
            <div className="kv-d-mc-hero-value">{fmtEur(result.totalMonthly, 0)}</div>
            <div className="kv-d-mc-hero-sub">per month</div>
          </div>
          <div className="kv-d-mc-table">
            {rows.map((r) => (
              <div className="kv-d-mc-row" key={r.label}>
                <span>{r.label}</span>
                <span className="kv-d-mc-val">{fmtEur(r.value, 0)}</span>
              </div>
            ))}
          </div>
          <div className="kv-d-mc-summary">
            <div className="kv-d-mc-summary-row">
              <span>Deposit</span>
              <span>{fmtEur(result.downPayment, 0)}</span>
            </div>
            <div className="kv-d-mc-summary-row">
              <span>Loan amount</span>
              <span>{fmtEur(result.loanAmount, 0)}</span>
            </div>
            <div className="kv-d-mc-summary-row">
              <span>Total interest</span>
              <span>{fmtEur(totalInterest, 0)}</span>
            </div>
            <div className="kv-d-mc-summary-row">
              <span>Total cost ({input.loanTermYears}y)</span>
              <span>{fmtEur(totalCost, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="kv-d-disclaimer">
        Illustrative estimate for planning purposes. Not financial advice — rates and taxes vary.
      </p>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Market Context
──────────────────────────────────────────────────────────── */

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : n % 10 === 1
        ? "st"
        : n % 10 === 2
          ? "nd"
          : n % 10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix}`;
}

function KvMarketContext({ ctx, island }: { ctx: IslandContext; island: string }) {
  const cards: {
    value: string;
    label: string;
    note?: string;
    percentile?: number;
  }[] = [];

  if (ctx.medianPrice !== null) {
    cards.push({
      value: formatMedian(ctx.medianPrice),
      label: `${island} median`,
      note: `${ctx.activeListings} priced listings`,
    });
  }
  if (ctx.medianPricePerSqm !== null) {
    cards.push({
      value: formatPricePerSqm(ctx.medianPricePerSqm),
      label: "Median €/m²",
      note: `${ctx.nSqmListings} with size data`,
    });
  }
  if (ctx.pricePercentile !== null) {
    cards.push({
      value: ordinal(ctx.pricePercentile),
      label: "Price percentile",
      note: ctx.pricePercentile >= 50 ? "Above island median" : "Below island median",
      percentile: ctx.pricePercentile,
    });
  }
  if (ctx.lastUpdated) {
    cards.push({
      value: new Date(ctx.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      label: "Last seen",
      note: "Latest tracked update",
    });
  }

  if (cards.length === 0) return null;

  return (
    <section className="kv-d-section">
      <div className="kv-d-section-head">
        <div>
          <div className="kv-d-ey">Context</div>
          <h2 className="kv-d-h2">Market context</h2>
        </div>
      </div>

      <div className={`kv-d-mctx-grid kv-d-mctx-${cards.length}`}>
        {cards.map((c) => (
          <div className="kv-d-mctx-card" key={c.label}>
            <div className="kv-d-mctx-value">{c.value}</div>
            <div className="kv-d-mctx-label">{c.label}</div>
            {c.percentile != null && (
              <div className="kv-d-mctx-bar">
                <div className="kv-d-mctx-bar-track">
                  <div className="kv-d-mctx-bar-dot" style={{ left: `${c.percentile}%` }} />
                </div>
                <div className="kv-d-mctx-bar-labels">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            )}
            {c.note && <div className="kv-d-mctx-note">{c.note}</div>}
          </div>
        ))}
      </div>

      <p className="kv-d-disclaimer">Asking price data from public listings. Not financial advice.</p>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Similar Properties — horizontal scroll carousel
──────────────────────────────────────────────────────────── */

function KvSimilar({ cards }: { cards: ListingCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [cards]);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    // Scroll by ~1 card width (card ~360px + 20 gap)
    el.scrollBy({ left: dir * 380, behavior: "smooth" });
  };

  return (
    <section className="kv-d-section">
      <div className="kv-d-section-head">
        <div>
          <div className="kv-d-ey">Comparable</div>
          <h2 className="kv-d-h2">Similar properties</h2>
        </div>
        <div className="kv-d-sim-nav">
          <button
            type="button"
            className={`kv-d-sim-arrow${canPrev ? "" : " kv-d-sim-arrow-off"}`}
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            disabled={!canPrev}
          >
            ‹
          </button>
          <button
            type="button"
            className={`kv-d-sim-arrow${canNext ? "" : " kv-d-sim-arrow-off"}`}
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            disabled={!canNext}
          >
            ›
          </button>
        </div>
      </div>

      <div className="kv-d-sim-scroll" ref={ref}>
        {cards.map((l) => {
          const loc = [l.city, l.island].filter(Boolean).join(", ");
          const imgUrl = l.image_urls?.[0] || l.image_url;
          const bg: React.CSSProperties = imgUrl
            ? { backgroundImage: `url("${imgUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundImage: "linear-gradient(135deg, #c9d4c8 0%, #a8bea4 100%)" };
          return (
            <Link key={l.id} to={`/listing/${l.id}`} className="kv-d-sim-card">
              <div className="kv-d-sim-img" style={bg}>
                {l.is_new && <span className="kv-d-sim-flag">New</span>}
              </div>
              <div className="kv-d-sim-body">
                <div className="kv-d-sim-top">
                  <span>{l.property_type ? capitalize(l.property_type) : ""}</span>
                  {loc && <span className="kv-d-sim-loc">{loc}</span>}
                </div>
                <div className="kv-d-sim-price">{formatPrice(l.price, l.currency)}</div>
                <div className="kv-d-sim-title">{toTitleCase(l.title)}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
