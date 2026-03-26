import * as fs from "fs";
import * as path from "path";
import sanitize from "sanitize-html";
import { getSupabaseClient } from "../core/supabaseClient";

process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;

const SOURCE_ID = "cv_gabetticasecapoverde";
const HEADLESS_TRANSLATION_SOURCE = "gtranslate_headless";
const TEXT_FALLBACK_TRANSLATION_SOURCE = "google_translate_text_fallback";
const SOURCE_LANGUAGE = "it";
const TARGET_LANGUAGE = "en";

type Mode = "dry-run" | "apply";

interface SourceRow {
  id: string;
  source_id: string;
  source_url: string | null;
  title: string | null;
  description: string | null;
  description_html: string | null;
  rendered_title_en: string | null;
  rendered_description_en: string | null;
  rendered_description_html_en: string | null;
}

interface ExtractedTranslation {
  rendered_title_en: string | null;
  rendered_description_en: string | null;
  rendered_description_html_en: string | null;
  translation_source: string;
}

interface PlannedUpdate {
  id: string;
  source_id: string;
  source_url: string;
  before: ExtractedTranslation;
  after: ExtractedTranslation;
}

interface PlannedSkip {
  id: string;
  source_id: string;
  source_url: string | null;
  reason: "missing_source_url" | "missing_rendered_title" | "unchanged" | "extract_failed" | "not_rendered_english";
}

interface PlanArtifact {
  kind: "cv_gabetti_rendered_english_backfill_plan";
  createdAt: string;
  mode: Mode;
  totalRows: number;
  updateCount: number;
  skipCount: number;
  updates: PlannedUpdate[];
  skips: PlannedSkip[];
}

interface BrowserSession {
  browser: any;
  page: any;
}

const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: ["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "a", "br"],
  allowedAttributes: {
    a: ["href"],
  },
  allowedSchemes: ["https", "http", "mailto"],
  disallowedTagsMode: "discard",
};

function getMode(): Mode {
  return process.env.APPLY === "1" ? "apply" : "dry-run";
}

function ensureArtifactsDir(): string {
  const artifactsDir = path.resolve(__dirname, "../artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  return artifactsDir;
}

function artifactPath(prefix: string, createdAt: string): string {
  const safe = createdAt.replace(/[:.]/g, "-");
  return path.join(ensureArtifactsDir(), `${prefix}_${safe}.json`);
}

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeHtml(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = sanitize(value, SANITIZE_OPTIONS).trim();
  return cleaned.length > 0 ? cleaned : null;
}

function buildParagraphHtml(text: string | null): string | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return normalizeHtml(`<p>${normalized}</p>`);
  }

  return normalizeHtml(paragraphs.map((part) => `<p>${part}</p>`).join(""));
}

function chunkText(text: string, maxLength = 1800): string[] {
  const chunks: string[] = [];
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  let current = "";
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);

    if (paragraph.length <= maxLength) {
      current = paragraph;
      continue;
    }

    for (let i = 0; i < paragraph.length; i += maxLength) {
      chunks.push(paragraph.slice(i, i + maxLength));
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

async function translateTextViaGoogle(text: string): Promise<string> {
  const chunks = chunkText(text);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${SOURCE_LANGUAGE}&tl=${TARGET_LANGUAGE}&dt=t&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      throw new Error(`Google Translate request failed: ${res.status}`);
    }

    const payload = await res.json();
    const translated = Array.isArray(payload?.[0])
      ? payload[0]
          .map((part: unknown) => (Array.isArray(part) ? String(part[0] ?? "") : ""))
          .join("")
      : "";

    const normalized = normalizeText(translated);
    if (!normalized) {
      throw new Error("Google Translate returned empty output");
    }

    translatedChunks.push(normalized);
  }

  return translatedChunks.join("\n\n");
}

async function loadRows(): Promise<SourceRow[]> {
  const sb = getSupabaseClient();
  const baseColumns = "id, source_id, source_url, title, description, description_html";
  const renderedColumns = "rendered_title_en, rendered_description_en, rendered_description_html_en";

  let { data, error } = await sb
    .from("listings")
    .select(`${baseColumns}, ${renderedColumns}`)
    .eq("source_id", SOURCE_ID)
    .order("updated_at", { ascending: false });

  if (error && error.code === "42703") {
    ({ data, error } = await sb
      .from("listings")
      .select(baseColumns)
      .eq("source_id", SOURCE_ID)
      .order("updated_at", { ascending: false }));
  }

  if (error) {
    throw new Error(`Failed to load rows: ${error.message}`);
  }

  return (data || []).map((row) => ({
    rendered_title_en: null,
    rendered_description_en: null,
    rendered_description_html_en: null,
    ...(row as SourceRow),
  }));
}

async function createBrowserSession(): Promise<BrowserSession> {
  const puppeteer = require("puppeteer-extra");
  const StealthPlugin = require("puppeteer-extra-plugin-stealth");
  puppeteer.use(StealthPlugin());

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    timeout: 45000,
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
  await page.setViewport({ width: 1440, height: 1200 });
  page.setDefaultNavigationTimeout(20000);
  page.setDefaultTimeout(20000);

  return { browser, page };
}

async function closeBrowserSession(session: BrowserSession | null): Promise<void> {
  if (!session?.browser) return;
  await session.browser.close();
}

async function extractRenderedEnglish(session: BrowserSession, sourceUrl: string): Promise<ExtractedTranslation | null> {
  try {
    // GTranslate commonly honors this cookie for client-side translation state.
    await session.page.setCookie({ name: "googtrans", value: "/it/en", domain: "gabetticasecapoverde.it", path: "/" });
    await session.page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await session.page.waitForSelector("body");
    await session.page.waitForTimeout?.(1500);

    await session.page.evaluate(async () => {
      const clickEnglish = () => {
        const link = document.querySelector("[data-gt-lang='en']") as HTMLElement | null;
        if (link) link.click();
      };

      const maybeTranslate = (window as any).doGTranslate;
      if (typeof maybeTranslate === "function") {
        try {
          maybeTranslate("it|en");
        } catch {}
      }

      clickEnglish();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      clickEnglish();
    });

    const extracted = await session.page.evaluate(() => {
      const pickLongest = (selectors: string[]) => {
        let best: HTMLElement | null = null;
        let bestLength = 0;

        for (const selector of selectors) {
          for (const node of Array.from(document.querySelectorAll(selector))) {
            const el = node as HTMLElement;
            const text = (el.innerText || "").replace(/\s+/g, " ").trim();
            if (text.length > bestLength) {
              best = el;
              bestLength = text.length;
            }
          }
        }

        return best;
      };

      const titleEl = pickLongest([".entry-title", ".entry-prop", "h1"]);
      const descriptionEl = pickLongest([
        ".wpestate_property_description",
        "#accordion_prop_details .panel-body",
        ".single-content",
        ".property_description",
      ]);

      return {
        rendered_title_en: titleEl ? titleEl.innerText : null,
        rendered_description_en: descriptionEl ? descriptionEl.innerText : null,
        rendered_description_html_en: descriptionEl ? descriptionEl.innerHTML : null,
      };
    });

    return {
      rendered_title_en: normalizeText(extracted.rendered_title_en),
      rendered_description_en: normalizeText(extracted.rendered_description_en),
      rendered_description_html_en: normalizeHtml(extracted.rendered_description_html_en),
      translation_source: HEADLESS_TRANSLATION_SOURCE,
    };
  } catch {
    return null;
  }
}

async function extractFallbackEnglish(row: SourceRow): Promise<ExtractedTranslation | null> {
  const sourceTitle = normalizeText(row.title);
  const sourceDescription = normalizeText(row.description);

  if (!sourceTitle && !sourceDescription) return null;

  try {
    const rendered_title_en = sourceTitle ? await translateTextViaGoogle(sourceTitle) : null;
    const rendered_description_en = sourceDescription ? await translateTextViaGoogle(sourceDescription) : null;

    return {
      rendered_title_en: normalizeText(rendered_title_en),
      rendered_description_en: normalizeText(rendered_description_en),
      rendered_description_html_en: buildParagraphHtml(rendered_description_en),
      translation_source: TEXT_FALLBACK_TRANSLATION_SOURCE,
    };
  } catch {
    return null;
  }
}

function translationsEqual(a: ExtractedTranslation, b: ExtractedTranslation): boolean {
  return (
    a.rendered_title_en === b.rendered_title_en &&
    a.rendered_description_en === b.rendered_description_en &&
    a.rendered_description_html_en === b.rendered_description_html_en
  );
}

function appearsUntranslated(row: SourceRow, extracted: ExtractedTranslation): boolean {
  const sourceTitle = normalizeText(row.title);
  const extractedTitle = normalizeText(extracted.rendered_title_en);
  const sourceDescription = normalizeText(row.description);
  const extractedDescription = normalizeText(extracted.rendered_description_en);
  const combined = `${extractedTitle ?? ""} ${extractedDescription ?? ""}`.toLowerCase();

  const italianSignals = [
    "descrizione",
    "vendita",
    "vendesi",
    "appartamento",
    "terreno",
    "proponiamo",
    "situato",
    "situata",
    "proprieta",
    "proprietà",
    "spiaggia",
    "camere",
    "indirizzo",
    "dettagli",
    "contattaci",
    "piano terra",
  ];
  const invalidPageSignals = [
    "i tuoi risultati di ricerca",
    "la tua pagina non è stata trovata",
    "siamo spiacenti",
  ];

  const sameTitle = !!sourceTitle && !!extractedTitle && sourceTitle === extractedTitle;
  const sourceDescriptionVisible =
    !!sourceDescription &&
    !!extractedDescription &&
    (extractedDescription.includes(sourceDescription) || sourceDescription.includes(extractedDescription));
  const italianSignalCount = italianSignals.filter((signal) => combined.includes(signal)).length;
  const invalidPageSignalCount = invalidPageSignals.filter((signal) => combined.includes(signal)).length;

  return (sameTitle && sourceDescriptionVisible) || italianSignalCount >= 2 || invalidPageSignalCount >= 1;
}

async function buildPlan(rows: SourceRow[]): Promise<PlanArtifact> {
  const updates: PlannedUpdate[] = [];
  const skips: PlannedSkip[] = [];
  const session = await createBrowserSession();

  try {
    for (const [index, row] of rows.entries()) {
      console.log(`[extract] ${index + 1}/${rows.length} ${row.id}`);
      if (!row.source_url) {
        skips.push({ id: row.id, source_id: row.source_id, source_url: row.source_url, reason: "missing_source_url" });
        continue;
      }

      let extracted = await extractRenderedEnglish(session, row.source_url);
      if (!extracted || appearsUntranslated(row, extracted)) {
        extracted = await extractFallbackEnglish(row);
      }

      if (!extracted) {
        skips.push({ id: row.id, source_id: row.source_id, source_url: row.source_url, reason: "extract_failed" });
        continue;
      }

      if (!extracted.rendered_title_en) {
        skips.push({ id: row.id, source_id: row.source_id, source_url: row.source_url, reason: "missing_rendered_title" });
        continue;
      }

      if (appearsUntranslated(row, extracted)) {
        skips.push({ id: row.id, source_id: row.source_id, source_url: row.source_url, reason: "not_rendered_english" });
        continue;
      }

      const before: ExtractedTranslation = {
        rendered_title_en: row.rendered_title_en,
        rendered_description_en: row.rendered_description_en,
        rendered_description_html_en: row.rendered_description_html_en,
        translation_source: "existing_rendered_fields",
      };

      if (translationsEqual(before, extracted)) {
        skips.push({ id: row.id, source_id: row.source_id, source_url: row.source_url, reason: "unchanged" });
        continue;
      }

      updates.push({
        id: row.id,
        source_id: row.source_id,
        source_url: row.source_url,
        before,
        after: extracted,
      });
    }
  } finally {
    await closeBrowserSession(session);
  }

  return {
    kind: "cv_gabetti_rendered_english_backfill_plan",
    createdAt: new Date().toISOString(),
    mode: getMode(),
    totalRows: rows.length,
    updateCount: updates.length,
    skipCount: skips.length,
    updates,
    skips,
  };
}

function writePlanArtifact(plan: PlanArtifact): string {
  const filePath = artifactPath("cv_gabetti_rendered_english_backfill_plan", plan.createdAt);
  fs.writeFileSync(filePath, JSON.stringify(plan, null, 2));
  return filePath;
}

async function applyPlan(plan: PlanArtifact): Promise<{ applied: number; failed: number }> {
  const sb = getSupabaseClient();
  let applied = 0;
  let failed = 0;

  for (const update of plan.updates) {
    const { error } = await sb
      .from("listings")
      .update({
        rendered_title_en: update.after.rendered_title_en,
        rendered_description_en: update.after.rendered_description_en,
        rendered_description_html_en: update.after.rendered_description_html_en,
        rendered_translation_source: update.after.translation_source,
        rendered_translation_source_language: SOURCE_LANGUAGE,
        rendered_translation_target_language: TARGET_LANGUAGE,
        rendered_translation_is_source_truth: false,
        rendered_translation_updated_at: new Date().toISOString(),
      })
      .eq("id", update.id)
      .eq("source_id", SOURCE_ID);

    if (error) {
      failed += 1;
      console.error(`[apply] failed ${update.id}: ${error.message}`);
      continue;
    }

    applied += 1;
  }

  return { applied, failed };
}

async function main() {
  const mode = getMode();
  const rows = await loadRows();
  const plan = await buildPlan(rows);
  const planPath = writePlanArtifact(plan);

  console.log(`[plan] rows=${plan.totalRows} updates=${plan.updateCount} skips=${plan.skipCount}`);
  console.log(`[plan] artifact=${planPath}`);
  console.log(`[policy] Italian remains source truth; rendered English is stored as translated/rendered output with per-row translation source metadata.`);

  if (mode === "dry-run") {
    console.log("[mode] dry-run only. Set APPLY=1 to write rendered English fields.");
    return;
  }

  const result = await applyPlan(plan);
  console.log(`[apply] applied=${result.applied} failed=${result.failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
