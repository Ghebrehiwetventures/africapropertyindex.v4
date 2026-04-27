/* Common buyer questions for Cape Verde property purchase.
   These power the FAQ block on /blog (Guides) and feed the
   knowledge-base search alongside articles. Sourced from the
   independent buyer's guide content already published on the
   site — kept short and direct so the FAQ is glanceable. */

export interface FaqEntry {
  question: string;
  answer: string;
  topic: "Buying" | "Legal" | "Tax" | "Money" | "Residence" | "Practical";
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "Can foreigners buy property in Cape Verde?",
    answer:
      "Yes. Cape Verde allows foreign nationals to purchase freehold property with the same rights as citizens. There are no restrictions on nationality and no requirement for residency, a local sponsor, or a holding company.",
    topic: "Buying",
  },
  {
    question: "Do I need a Cape Verdean tax number to buy?",
    answer:
      "Yes — every person whose name will appear on the deed needs a NIF (Número de Identificação Fiscal). It's a free, nine-digit ID issued at a Casa do Cidadão or the Cartório. Allow one to five days, or use a fiscal representative if applying from abroad.",
    topic: "Legal",
  },
  {
    question: "Do I need a local bank account?",
    answer:
      "Yes. You need a Cape Verdean account to pay the seller, the IUP property tax, and the notary fees. Banco Comercial do Atlântico and Caixa Económica are the most commonly used. The escudo is pegged to the euro at a fixed 110.265 CVE per €1.",
    topic: "Money",
  },
  {
    question: "What taxes apply when buying property?",
    answer:
      "The main one is IUP (Imposto Único sobre o Património), the property transfer tax — typically 1.5% of the purchase price, paid before the deed is signed. Stamp duty (Imposto de Selo) of 0.5–1% and notary fees of around 1–2% also apply.",
    topic: "Tax",
  },
  {
    question: "How long does the buying process take?",
    answer:
      "Plan for 6 to 12 weeks from accepted offer to signed deed (escritura). The bottleneck is usually due diligence — verifying title, checking for outstanding debts, and confirming the property is free of liens. A reservation deposit of 5–10% holds the property while this happens.",
    topic: "Practical",
  },
  {
    question: "Do I need a Cape Verdean lawyer?",
    answer:
      "Strongly recommended — and not the seller's. Hire an independent advogado to verify title, check debts, review contracts, and represent you at the notary. Typical fees are €500–1,500 depending on complexity. They can also act for you under a Power of Attorney if you can't travel.",
    topic: "Legal",
  },
  {
    question: "Can I get a mortgage in Cape Verde?",
    answer:
      "Local mortgages are available to foreigners but are limited — usually 50–70% LTV, in escudos, at higher rates than the eurozone (typically 6–9%). Most non-resident buyers self-fund or use equity from a property at home, since the local mortgage market is small.",
    topic: "Money",
  },
  {
    question: "Does owning property give me residency?",
    answer:
      "Not automatically. Property ownership is independent of residency. Cape Verde does, however, offer a residence permit pathway for property owners and retirees who can demonstrate stable income. The two processes are separate — buying first does not entitle you to a permit.",
    topic: "Residence",
  },
  {
    question: "Are there annual property taxes?",
    answer:
      "Yes. Owners pay an annual IUP municipal tax of roughly 0.1–0.4% of the property's rateable value, depending on the municipality and property type. It's modest compared to most European jurisdictions but not zero.",
    topic: "Tax",
  },
  {
    question: "Can I rent out the property when I'm not there?",
    answer:
      "Yes. Both long-stay leases and short-term holiday rentals are legal. For tourist rentals (RJET licence), you'll register the property with the Ministry of Tourism and pay a tourism tax per guest, per night. Rental income is taxable in Cape Verde.",
    topic: "Practical",
  },
  {
    question: "Which island is best for investment?",
    answer:
      "Sal and Boa Vista lead on tourist-rental yield (driven by direct European flights and resort demand). Santiago and São Vicente are stronger for long-stay residential demand. Santo Antão and Brava are quieter, scenic, and slower to liquidate. The right island depends on whether you want yield or lifestyle.",
    topic: "Buying",
  },
  {
    question: "Can I repatriate the proceeds when I sell?",
    answer:
      "Yes. Cape Verde places no restrictions on the repatriation of sale proceeds for foreign owners. The buyer pays you in escudos through the notary process; you convert and transfer through your local bank account.",
    topic: "Money",
  },
];
