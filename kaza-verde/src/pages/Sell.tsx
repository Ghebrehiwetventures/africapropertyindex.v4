import { useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import "./Rent.css";

export default function Sell() {
  useDocumentMeta("Sell", "List your Cape Verde property — coming soon.");
  const navigate = useNavigate();

  return (
    <div className="rent-coming-soon anim-fu delay-1">
      <div className="rent-icon">
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h1>Sell — <em>Coming Soon</em></h1>
      <p>
        We're working on letting property owners list directly on KazaVerde.
        In the meantime, explore our buy listings.
      </p>
      <button className="bp" onClick={() => navigate("/listings")}>BROWSE LISTINGS</button>
    </div>
  );
}
