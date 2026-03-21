import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import PropertyCard from "../components/PropertyCard";
import { useSaved } from "../hooks/useSaved";
import type { DemoListing } from "../lib/demo-data";
import { arei } from "../lib/arei";
import { detailToDemoListing } from "../lib/transforms";
import "./Saved.css";

export default function Saved() {
  useDocumentMeta("Saved Properties", "Your saved property listings.");
  const navigate = useNavigate();
  const { saved } = useSaved();
  const [listings, setListings] = useState<DemoListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailableCount, setUnavailableCount] = useState(0);

  useEffect(() => {
    async function loadSaved() {
      const ids = [...new Set(saved)];
      if (ids.length === 0) {
        setListings([]);
        setUnavailableCount(0);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const resolved = await Promise.all(ids.map((id) => arei.getListing(id)));
        const found = resolved.filter((item): item is NonNullable<typeof item> => item !== null);
        setListings(found.map(detailToDemoListing));
        setUnavailableCount(ids.length - found.length);
      } catch (e) {
        setListings([]);
        setUnavailableCount(0);
        setError(e instanceof Error ? e.message : "Could not load saved properties.");
      } finally {
        setLoading(false);
      }
    }
    loadSaved();
  }, [saved]);

  return (
    <>
      <div className="saved-header anim-fu delay-1">
        <h1>Saved <em>Properties</em></h1>
        <p>Properties you bookmark are stored in this browser only. No login required.</p>
      </div>

      {loading && (
        <div className="saved-empty anim-fu delay-2">
          <h3>Loading saved properties...</h3>
        </div>
      )}

      {!loading && error && (
        <div className="saved-empty anim-fu delay-2">
          <h3>Could not load saved properties</h3>
          <p>{error}</p>
          <button className="bp" onClick={() => navigate("/listings")}>BROWSE PROPERTIES</button>
        </div>
      )}

      {!loading && !error && unavailableCount > 0 && (
        <div className="saved-empty anim-fu delay-2" style={{ marginBottom: 16 }}>
          <p>
            {unavailableCount} saved {unavailableCount === 1 ? "property is" : "properties are"} no longer available in the current launch feed.
          </p>
        </div>
      )}

      {!loading && !error && listings.length > 0 ? (
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {listings.map((l, i) => (
            <PropertyCard key={l.id} listing={l} index={i} />
          ))}
        </div>
      ) : !loading && !error ? (
        <div className="saved-empty anim-fu delay-2">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3>No saved properties yet</h3>
          <p>Use the bookmark icon on any property card to build a list on this device.</p>
          <button className="bp" onClick={() => navigate("/listings")}>BROWSE PROPERTIES</button>
        </div>
      ) : null}
    </>
  );
}
