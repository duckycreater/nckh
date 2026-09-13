import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const port = 4173;
const localCredential = "browser-e2e-only-local-value-not-a-real-credential";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm start",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(port),
      NODE_ENV: "production",
      BMO_DATA_FILE: path.join(os.tmpdir(), "bmo-browser-e2e-data.json"),
      RESEARCH_DB_ENABLED: "false",
      FIREBASE_SERVICE_ACCOUNT: "",
      FIREBASE_SERVICE_ACCOUNT_BASE64: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      GEMINI_API_KEY: "",
      GROQ_API_KEY: "",
      RESEND_API_KEY: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      ADMIN_API_KEY: "browser-e2e-admin-key",
      AUTH_SECRET: localCredential,
      BMO_MODEL_HMAC_SECRET: localCredential,
    },
  },
});
