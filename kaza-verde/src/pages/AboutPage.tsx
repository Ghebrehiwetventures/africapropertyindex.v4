import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, Database, RefreshCw, Code2, ArrowRight } from "lucide-react";

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-ocean-900 text-white py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">{t("about.title")}</h1>
          <p className="mt-4 text-lg text-white/70 leading-relaxed">
            {t("about.intro")}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-16">
        {/* How it works */}
        <Section
          icon={Database}
          title={t("about.howItWorks")}
          text={t("about.howItWorksText")}
        />

        {/* Data source */}
        <Section
          icon={Shield}
          title={t("about.dataSource")}
          text={t("about.dataSourceText")}
        />

        {/* Quality */}
        <Section
          icon={RefreshCw}
          title={t("about.qualityTitle")}
          text={t("about.qualityText")}
        />

        {/* For developers */}
        <div className="bg-ocean-50 rounded-2xl p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-ocean-100 flex items-center justify-center shrink-0 mt-0.5">
              <Code2 className="w-5 h-5 text-ocean-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t("about.forDevelopers")}</h2>
              <p className="mt-2 text-gray-600 leading-relaxed">
                {t("about.forDevelopersText")}
              </p>
              <Link
                to="/developers"
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-ocean-700 hover:text-ocean-900 transition-colors"
              >
                {t("about.devLink")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-ocean-700" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-gray-600 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
