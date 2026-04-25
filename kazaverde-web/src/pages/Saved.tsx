import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useSaved } from "../hooks/useSaved";
import { arei } from "../lib/arei";
import type { ListingCard as ListingCardType } from "arei-sdk";
import { Card } from "./Listings";
import "./Saved.css";

/** Resolve a ListingDetail to a ListingCard shape so the Listings <Card> works.
 *  We project only the fields the card reads. */
function detailToCard(d: NonNullable<Awaited<ReturnType<typeof arei.getListing>>>): ListingCardType {
  return {
    id: d.id,
    source_id: d.source_id,
    title: d.title,
    price: d.price,
    currency: d.currency,
    city: d.city,
    island: d.island,
    property_type: d.property_type,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    land_area_sqm: d.land_area_sqm,
    image_url: d.image_urls?.[0] ?? null,
    image_urls: d.image_urls,
    is_new: d.is_new,
    first_seen_at: d.first_seen_at,
    last_seen_at: d.last_seen_at,
  } as ListingCardType;
}

export default function Saved() {
  useDocumentMeta(
    "Shortlist — KazaVerde",
    "Properties you've saved on this device. A read-only index of public Cape Verde listings.",
  );

  const { saved, count } = useSaved();
  const [cards, setCards] = useState<ListingCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set(saved)];

    if (ids.length === 0) {
      setCards([]);
      setUnavailable(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(ids.map((id) => arei.getListing(id).catch(() => null)))
      .then((resolved) => {
        if (cancelled) return;
        const found = resolved.filter((x): x is NonNullable<typeof x> => x !== null);
        setCards(found.map(detailToCard));
        setUnavailable(ids.length - found.length);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [saved]);

  return (
    <div className="kv-saved">
      {/* Hero — same green band rhythm as Listings, but reads as personal */}
      <header className="kv-saved-hero">
        <div className="kv-saved-hero-inner">
          <div className="kv-saved-eyebrow">Your shortlist</div>
          <h1 className="kv-saved-title">Properties you're tracking.</h1>
          <p className="kv-saved-sub">
            Saved on this device only — no login, no sync, no marketing list. Cape Verde Real
            Estate Index doesn't broker; every entry links back to its public source.
          </p>
          <div className="kv-saved-meta">
            <span>
              <b>{count}</b> {count === 1 ? "property" : "properties"} saved
            </span>
            {unavailable > 0 && (
              <span>
                · <b>{unavailable}</b> no longer in feed
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="kv-saved-body">
        {loading && <div className="kv-empty"><strong>Loading shortlist…</strong></div>}

        {!loading && cards.length === 0 && (
          <div className="kv-saved-empty">
            <div className="kv-saved-empty-eyebrow">Empty shortlist</div>
            <h2>Nothing saved yet.</h2>
            <p>
              Open any listing and tap <b>Save to shortlist</b> in the index record card.
              Your shortlist lives in this browser — no account needed.
            </p>
            <Link to="/" className="kv-saved-cta">Browse all listings →</Link>
          </div>
        )}

        {!loading && cards.length > 0 && (
          <div className="kv-grid">
            {cards.map((l) => <Card key={l.id} l={l} />)}
          </div>
        )}
      </section>
    </div>
  );
}
