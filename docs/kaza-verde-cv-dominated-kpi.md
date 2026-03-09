# Kaza Verde – KPI-checklista: "CV dominerad"

Objektiva krav för att kunna säga att Cape Verde-marknaden är **dominerad** (data- och produktnivå).  
Kör `npx ts-node scripts/cv_kpi_report.ts` för att mäta nuläge mot dessa KPIs.

---

## 1️⃣ DATA

### Feed-kontrakt (måste alltid vara tydligt)
- **Raw visible CV rows**: `approved = true` och `is_superseded != true` i `public.listings` för `cv_%`.
- **Public feed CV rows**: rader i `public.v1_feed_cv` efter public gates (bild, canonical island, source_url, stub/test-exkludering).
- KPI-rapporten ska alltid visa båda siffrorna och skillnaden mellan dem.

### Volym & unika listings
| KPI | Mål (dominerad) | Nuläge |
|-----|------------------|--------|
| Raw visible CV-listings (approved, ej superseded) | ≥ 300 | Kör rapport |
| Public feed CV-listings (`v1_feed_cv`) | Informativt, ska följas över tid | Kör rapport |
| Listings med `price > 0` | ≥ 95 % | Kör rapport |
| Listings med giltig location (island + city där det finns) | ≥ 90 % | Kör rapport |
| Listings med ≥1 giltig bild-URL | ≥ 90 % | Kör rapport |
| Listings med area ELLER bedrooms (minst ett) | ≥ 85 % | Kör rapport |
| Andel dubletter (samma canonical_id, ej vinnare) | ≤ 5 % | Kör rapport |
| Listings uppdaterade senaste 30 dagarna | ≥ 80 % | Kör rapport |
| Antal stabila källor (≥10 listings, senaste 30 d) | ≥ 5 | Kör rapport |

### Tolkning
- **Coverage ofullständig** = under 200 unika listings eller <80 % med price/location/images.
- **Drop-rate hög** = >15 % av *raw visible* tappas innan public feed (t.ex. inga bilder, ogiltig ö, stub/test-källor).
- **Production-grade** = alla data-KPIs gröna + inga källor med 0 listings senaste 30 d utan plan.

---

## 2️⃣ PRODUKT

### Konkurrenskraft (consumer portal)
| KPI | Mål |
|-----|-----|
| Tydlig datarensnings-fördel vs. 5 mäklarsajter | Beskrivbar USP (t.ex. "enda med X") |
| Marknadsöversikt (antal per ö, per typ) | Synlig på startsida eller dedikerad sida |
| Statistik-layer (medianpris, pris/sqm, trend) | Minst 3 indikatorer publicerade |
| "Sparar användaren tid" (tydlig value prop) | Formulerad och synlig |

### Konkurrenskraft (data-portal / index showcase)
| KPI | Mål |
|-----|-----|
| Median price per island | Publicerad, uppdaterad per ingest |
| Price per sqm (där area finns) | Minst per ö eller per typ |
| Supply trend (antal listings över tid) | Graf eller tabell |
| Distribution per property type | Synlig |
| Inventory growth / average time listed | Önskat för "index proof" |

---

## 3️⃣ DISTRIBUTION

| KPI | Mål (dominerad) |
|-----|------------------|
| Organisk SEO (indexerade sidor, rankade nyckelord) | Mätbart (Search Console) |
| Backlinks (antal domäner) | ≥ 5 relevanta |
| Direkttrafik / brand search | Mätbart (Analytics) |

*Not: Ingen distribution engine = ingen maskin som trycker in användare även med bra data.*

---

## 4️⃣ POSITIONERING

| Val | Beskrivning |
|-----|-------------|
| A) Consumer portal (Zillow-liknande) | Kräver UX, SEO, trust, support. |
| B) Data layer / marknadsindex | Kräver statistik, index, visualiseringar. |
| C) API front | Kräver developer docs, endpoints, SLA. |

**Rekommendation (långsikt):** B – *Den mest transparenta marknadsdataportalen i Kap Verde.*  
Då blir Kaza Verde proof of index capability för Africa Real Estate Index.

---

## 5️⃣ MONETISERING

| KPI | Mål (när positionering är klar) |
|-----|---------------------------------|
| API-klienter / B2B-avtal | Mätbart antal eller pipeline |
| Data licensing / premium | Beslutsunderlag klart |

---

## Sammanfattning: "CV dominerad"

- **Data:** Alla data-KPIs i §1 uppfyllda (volym, kvalitet, färskhet, källor).
- **Produkt:** Tydlig positionering (B rekommenderas) och minst 3 statistik-indikatorer live.
- **Distribution:** Minst grundläggande SEO + några backlinks.
- **Positionering:** Brand och produkt i alignment (inte halvvägs mellan A, B, C).
- **Monetisering:** Pipeline eller tydlig plan, inte krav för "dominerad" men för nästa steg.

Kör **`npx ts-node scripts/cv_kpi_report.ts`** för siffror idag.  
(Kräver `.env` i projektroten med `SUPABASE_URL` och `SUPABASE_SERVICE_ROLE_KEY` eller `SUPABASE_ANON_KEY`, samma som för ingest.)
