import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/rtl.css";
import "./lib/i18n";
import { applyDocumentDirection, isRTL } from "./lib/format";
import { getCurrentLanguage } from "./lib/i18n";

// Apply LTR/RTL direction at boot so the first paint is correct even before
// React mounts.
applyDocumentDirection(getCurrentLanguage());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
