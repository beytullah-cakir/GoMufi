import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { PostHogProvider } from "posthog-js/react";

// PostHog analytics + hata takibi. Anahtar yalnızca .env'de tanımlıysa devreye girer;
// tanımsızsa (dev/anahtarsız build) uygulama olduğu gibi, izleme olmadan çalışır.
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
// KVKK: veri AB'de tutulsun diye varsayılan host EU. Gerekirse env ile değiştirilir.
const POSTHOG_HOST =
  (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) || "https://eu.i.posthog.com";

const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

createRoot(document.getElementById("root")!).render(
  POSTHOG_KEY ? (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{
        api_host: POSTHOG_HOST,
        // Anonim ziyaretçiye profil açma — yalnızca identify edilen kullanıcıya
        person_profiles: "identified_only",
        // Frontend JS hatalarını otomatik yakala (hata takibi kalemi)
        capture_exceptions: true,
        // Sayfa görüntüleme + tıklama otomatik (SPA: history değişiminde pageview)
        autocapture: true,
        capture_pageview: "history_change",
        // v1: reşit olmayan kullanıcı gizliliği için oturum kaydı KAPALI
        disable_session_recording: true,
      }}
    >
      {app}
    </PostHogProvider>
  ) : (
    app
  )
);
