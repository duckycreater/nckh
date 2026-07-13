import { renderEmailTemplate } from "../server/services/emailTemplates.ts";
import { getErrorMessage } from "../server/services/errorMessages.ts";

console.log("=== Error messages ===");
for (const loc of ["vi", "en", "ja", "ar"]) {
  console.log(`${loc}.clan.full: ${getErrorMessage("error.clan.full", loc)}`);
  console.log(`${loc}.unauthorized: ${getErrorMessage("error.unauthorized", loc)}`);
}

console.log("\n=== Email templates ===");
for (const loc of ["vi", "en", "ja", "ar"]) {
  const out = renderEmailTemplate("welcome", loc, {
    name: loc === "ja" ? "佐藤" : loc === "ar" ? "أحمد" : "Minh",
  });
  console.log(`--- ${loc} ---`);
  console.log(`subject: ${out.subject}`);
  console.log(`text:    ${out.text.slice(0, 120)}...`);
  console.log(`htmlDir: ${out.html.includes('dir="rtl"') ? "rtl" : "ltr"}`);
  console.log();
}

console.log("OK");