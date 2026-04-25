import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSaved } from "../hooks/useSaved";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useSaved();

  const closeMenu = () => setMenuOpen(false);

  // Shortlist label includes a count when the user has saved anything,
  // so they can see at a glance their list has things in it.
  const shortlistLabel = count > 0 ? `SHORTLIST · ${count}` : "SHORTLIST";

  return (
    <nav className="nav anim-fd">
      <div className="nav-inner">
        <a className="logo" onClick={() => navigate("/")} role="button" tabIndex={0}>
          CV · Real Estate Index
        </a>

        <div className="nc hide-mobile">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>LISTINGS</NavLink>
          <NavLink to="/saved" className={({ isActive }) => (isActive ? "on" : "")}>{shortlistLabel}</NavLink>
        </div>

        <button
          type="button"
          className="nav-hamburger hide-desktop"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>

        <div className={`nc-mobile${menuOpen ? " open" : ""}`}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")} onClick={closeMenu}>LISTINGS</NavLink>
          <NavLink to="/saved" className={({ isActive }) => (isActive ? "on" : "")} onClick={closeMenu}>{shortlistLabel}</NavLink>
        </div>
      </div>
    </nav>
  );
}
