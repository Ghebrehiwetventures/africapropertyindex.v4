import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { HomePage } from "./pages/HomePage";
import { PropertiesPage } from "./pages/PropertiesPage";
import { PropertyDetailPage } from "./pages/PropertyDetailPage";
import { AboutPage } from "./pages/AboutPage";
import { DevelopersPage } from "./pages/DevelopersPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

function SetupRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean-50 p-6">
      <div className="max-w-md rounded-xl bg-white shadow-lg border border-ocean-200 p-8">
        <h1 className="text-xl font-bold text-ocean-900 mb-2">Kaza Verde – setup</h1>
        <p className="text-ocean-700 mb-4">
          Lägg till Supabase-nycklar så att appen kan hämta annonser. Skapa filen{" "}
          <code className="bg-ocean-100 px-1 rounded">kaza-verde/.env</code> med:
        </p>
        <pre className="bg-ocean-950 text-ocean-100 p-4 rounded-lg text-sm overflow-x-auto">
{`VITE_SUPABASE_URL=https://ditt-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=din-anon-key`}
        </pre>
        <p className="text-ocean-600 text-sm mt-4">
          Du kan kopiera från <code className="bg-ocean-100 px-1 rounded">diagnostics/.env.local</code> (byt till VITE_-prefix) eller från Supabase-projektets API-inställningar. Starta om dev-servern efter att du sparat .env.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!hasSupabase) return <SetupRequired />;
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/developers" element={<DevelopersPage />} />
              {/* Legacy routes */}
              <Route path="/cv" element={<Navigate to="/properties" replace />} />
              <Route path="/cv/:id" element={<Navigate to="/properties/:id" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
