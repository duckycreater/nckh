import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/rtl.css";
import "./lib/i18n";
import { applyDocumentDirection } from "./lib/format";
import { getCurrentLanguage } from "./lib/i18n";
import { installAppUpdateManager } from "./services/appUpdateManager";

// Apply LTR/RTL direction at boot so the first paint is correct even before
// React mounts.
applyDocumentDirection(getCurrentLanguage());

// Do not rely on the browser's delayed service-worker update schedule. The
// manager checks immediately and whenever an existing tab becomes active.
void installAppUpdateManager();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
