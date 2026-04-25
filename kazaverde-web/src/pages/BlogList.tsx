import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { BLOG_ARTICLES } from "../lib/blog-data";
import "./BlogList.css";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BlogList() {
  useDocumentMeta(
    "Cape Verde property guides — KazaVerde",
    "Cape Verde real estate insights, buying guides, market analysis, legal requirements and investment tips. Independent reporting from the Cape Verde Real Estate Index.",
  );

  // Articles are stored newest-first in blog-data.ts; respect that order.
  const articles = BLOG_ARTICLES;

  return (
    <div className="kv-blog">
      {/* Hero — same green band rhythm as Listings/Saved */}
      <header className="kv-blog-hero">
        <div className="kv-blog-hero-inner">
          <div className="kv-blog-eyebrow">Knowledge index</div>
          <h1 className="kv-blog-title">
            How Cape Verde property actually works.
          </h1>
          <p className="kv-blog-sub">
            Independent guides from the Cape Verde Real Estate Index. Buying
            process, taxes, residency, rental yields, and the differences between
            islands — written for buyers who want the data, not the pitch.
          </p>
          <div className="kv-blog-meta">
            <span><b>{articles.length}</b> articles</span>
            <span>· Updated continuously</span>
          </div>
        </div>
      </header>

      {/* Article grid */}
      <section className="kv-blog-body">
        <div className="kv-blog-grid">
          {articles.map((a) => (
            <Link key={a.slug} to={`/blog/${a.slug}`} className="kv-blog-card">
              <div className="kv-blog-card-meta">
                <span>{fmtDate(a.date)}</span>
                <span>· {a.readTime}</span>
              </div>
              <h2 className="kv-blog-card-title">{a.title}</h2>
              <p className="kv-blog-card-desc">{a.description}</p>
              <div className="kv-blog-card-tags">
                {a.tags.map((t) => (
                  <span key={t} className="kv-blog-tag">{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
