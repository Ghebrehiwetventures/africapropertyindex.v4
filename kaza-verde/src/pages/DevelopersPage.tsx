import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Database, Shield, RefreshCw, Globe, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";

export function DevelopersPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-ocean-900 text-white py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">{t("developers.title")}</h1>
          <p className="mt-4 text-lg text-white/70 leading-relaxed">
            {t("developers.intro")}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-16">
        {/* Live API Explorer */}
        <ApiExplorer />

        {/* Code examples */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("developers.codeExamples")}</h2>
          <div className="space-y-4">
            <CodeBlock
              title="JavaScript (Supabase Client)"
              lang="javascript"
              code={`import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const { data, count } = await supabase
  .from('listings')
  .select('*', { count: 'exact' })
  .eq('approved', true)
  .ilike('source_id', 'cv_%')
  .gte('bedrooms', 2)
  .order('price', { ascending: true })
  .limit(10)

console.log(\`Found \${count} properties\`)
data.forEach(p => console.log(p.title, p.price))`}
            />
            <CodeBlock
              title="cURL (REST API)"
              lang="bash"
              code={`curl 'https://YOUR_PROJECT.supabase.co/rest/v1/listings?approved=eq.true&source_id=ilike.cv_%&bedrooms=gte.2&order=price.asc&limit=10' \\
  -H "apikey: YOUR_ANON_KEY" \\
  -H "Authorization: Bearer YOUR_ANON_KEY"`}
            />
            <CodeBlock
              title="Python"
              lang="python"
              code={`from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

result = supabase.table('listings') \\
    .select('*', count='exact') \\
    .eq('approved', True) \\
    .ilike('source_id', 'cv_%') \\
    .gte('bedrooms', 2) \\
    .order('price') \\
    .limit(10) \\
    .execute()

for listing in result.data:
    print(f"{listing['title']} — €{listing['price']}")`}
            />
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{t("developers.features")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Feature icon={Database} title={t("developers.feature1Title")} text={t("developers.feature1Text")} />
            <Feature icon={Shield} title={t("developers.feature2Title")} text={t("developers.feature2Text")} />
            <Feature icon={RefreshCw} title={t("developers.feature3Title")} text={t("developers.feature3Text")} />
            <Feature icon={Globe} title={t("developers.feature4Title")} text={t("developers.feature4Text")} />
          </div>
        </section>

        {/* CTA */}
        <section className="bg-ocean-50 rounded-2xl p-8 sm:p-10 text-center">
          <h2 className="text-xl font-bold text-gray-900">{t("developers.getAccess")}</h2>
          <p className="mt-2 text-gray-600">{t("developers.getAccessText")}</p>
          <a
            href={`mailto:${t("developers.contactEmail")}`}
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-ocean-700 text-white font-medium rounded-lg hover:bg-ocean-800 transition-colors"
          >
            <Mail className="w-4 h-4" />
            {t("developers.contactEmail")}
          </a>
        </section>
      </div>
    </div>
  );
}

function ApiExplorer() {
  const { t } = useTranslation();
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const { data, error, count } = await supabase
        .from("listings")
        .select("id,title,price,currency,island,city,bedrooms,bathrooms", { count: "exact" })
        .eq("approved", true)
        .ilike("source_id", "cv_%")
        .order("id", { ascending: false })
        .limit(3);

      if (error) throw error;
      setResponse(JSON.stringify({ count, data }, null, 2));
    } catch (err) {
      setResponse(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("developers.tryIt")}</h2>
      <p className="text-gray-500 mb-6">{t("developers.tryItSubtitle")}</p>

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <code className="text-sm text-gray-300">
            supabase.from("listings").select("*").eq("approved", true).ilike("source_id", "cv_%").limit(3)
          </code>
          <button
            onClick={runQuery}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {loading ? t("developers.loading") : t("developers.runQuery")}
          </button>
        </div>

        <div className="p-4 max-h-80 overflow-auto">
          {response ? (
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{response}</pre>
          ) : (
            <p className="text-sm text-gray-500 italic">
              {t("developers.response")}…
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
      <Icon className="w-6 h-6 text-ocean-600 mb-3" />
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
    </div>
  );
}

function CodeBlock({ title, lang, code }: { title: string; lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-medium text-gray-400">{title}</span>
        <button
          onClick={copy}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm text-gray-300 font-mono">
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </div>
  );
}
