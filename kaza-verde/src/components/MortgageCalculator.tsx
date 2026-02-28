import { useState, useMemo } from "react";
import { calcMortgage, type MortgageInput } from "../lib/calcMortgage";
import "./MortgageCalculator.css";

interface Props {
  price?: number | null;
}

const DEFAULTS: MortgageInput = {
  totalAmount: 150000,
  downPaymentPct: 20,
  interestRate: 4.5,
  loanTermYears: 25,
  propertyTaxPct: 0.3,
  insuranceAnnual: 600,
  hoaMonthly: 0,
};

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDecimal(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" className="mc-donut">
      {segments
        .filter((s) => s.value > 0)
        .map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={24}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
            />
          );
        })}
      <text x={cx} y={cy - 6} textAnchor="middle" className="mc-donut-label">
        Monthly
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="mc-donut-total">
        {fmt(total)}
      </text>
    </svg>
  );
}

export default function MortgageCalculator({ price }: Props) {
  const [input, setInput] = useState<MortgageInput>(() => ({
    ...DEFAULTS,
    totalAmount: price ?? DEFAULTS.totalAmount,
  }));
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = <K extends keyof MortgageInput>(key: K, val: MortgageInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: val }));

  const result = useMemo(() => calcMortgage(input), [input]);

  const segments: DonutSegment[] = [
    { label: "Loan payment", value: result.monthlyMortgage, color: "hsl(65 70% 55%)" },
    { label: "Property tax", value: result.monthlyTax, color: "hsl(25 50% 50%)" },
    { label: "Insurance", value: result.monthlyInsurance, color: "hsl(200 50% 50%)" },
    { label: "Condo fee", value: result.monthlyHoa, color: "hsl(280 40% 55%)" },
  ];

  return (
    <section className="mc">
      <h2 className="mc-title">
        Monthly Cost <em>Estimate</em>
      </h2>

      <div className="mc-grid">
        {/* ── Left: inputs + inline summary ── */}
        <div className="mc-left">
          <div className="mc-inputs">
            <div className="mc-field mc-field-full">
              <label>Property price</label>
              <input
                type="number"
                value={input.totalAmount || ""}
                onChange={(e) => set("totalAmount", Number(e.target.value))}
                placeholder="Property price"
                min={0}
              />
            </div>

            <div className="mc-field">
              <label>Deposit (%)</label>
              <input
                type="number"
                value={input.downPaymentPct}
                onChange={(e) => set("downPaymentPct", Number(e.target.value))}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="mc-field">
              <label>Interest rate (%)</label>
              <input
                type="number"
                value={input.interestRate}
                onChange={(e) => set("interestRate", Number(e.target.value))}
                min={0}
                max={30}
                step={0.1}
              />
            </div>

            <div className="mc-field">
              <label>Loan term (years)</label>
              <input
                type="number"
                value={input.loanTermYears}
                onChange={(e) => set("loanTermYears", Number(e.target.value))}
                min={1}
                max={40}
                step={1}
              />
            </div>

            <div className="mc-field">
              <label>Condo fee (€/mo)</label>
              <input
                type="number"
                value={input.hoaMonthly}
                onChange={(e) => set("hoaMonthly", Number(e.target.value))}
                min={0}
                step={10}
              />
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            className={`mc-adv-toggle${showAdvanced ? " mc-adv-open" : ""}`}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none" width={14} height={14}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {showAdvanced ? "Hide" : "Show"} advanced
          </button>

          {showAdvanced && (
            <div className="mc-inputs mc-inputs-adv">
              <div className="mc-field">
                <label>Annual property tax (%)</label>
                <input
                  type="number"
                  value={input.propertyTaxPct}
                  onChange={(e) => set("propertyTaxPct", Number(e.target.value))}
                  min={0}
                  max={10}
                  step={0.1}
                />
              </div>

              <div className="mc-field">
                <label>Insurance (€/yr)</label>
                <input
                  type="number"
                  value={input.insuranceAnnual}
                  onChange={(e) => set("insuranceAnnual", Number(e.target.value))}
                  min={0}
                  step={50}
                />
              </div>
            </div>
          )}

          {/* Inline summary — visible early on mobile */}
          <div className="mc-inline-summary">
            <div className="mc-inline-total">
              <span>Estimated monthly cost</span>
              <span>{fmtDecimal(result.totalMonthly)}</span>
            </div>
            <div className="mc-inline-row">
              <span>Loan payment</span>
              <span>{fmtDecimal(result.monthlyMortgage)}</span>
            </div>
            <div className="mc-inline-row">
              <span>Deposit</span>
              <span>{fmt(result.downPayment)}</span>
            </div>
            <div className="mc-inline-row">
              <span>Loan amount</span>
              <span>{fmt(result.loanAmount)}</span>
            </div>
          </div>
        </div>

        {/* ── Right: total (hero) → donut + legend → deposit/loan ── */}
        <div className="mc-result">
          <div className="mc-hero-total">
            <span className="mc-hero-label">Estimated monthly</span>
            <span className="mc-hero-value">{fmtDecimal(result.totalMonthly)}</span>
          </div>

          <DonutChart segments={segments} />

          <div className="mc-legend">
            {segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <div className="mc-legend-row" key={s.label}>
                  <span className="mc-swatch" style={{ background: s.color }} />
                  <span className="mc-legend-label">{s.label}</span>
                  <span className="mc-legend-val">{fmtDecimal(s.value)}</span>
                </div>
              ))}
          </div>

          <div className="mc-summary">
            <div className="mc-summary-row">
              <span>Deposit</span>
              <span>{fmt(result.downPayment)}</span>
            </div>
            <div className="mc-summary-row">
              <span>Loan amount</span>
              <span>{fmt(result.loanAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
