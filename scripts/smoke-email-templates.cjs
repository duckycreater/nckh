/**
 * Smoke test for emailTemplates.renderEmailTemplate()
 * Run: node scripts/smoke-email-templates.cjs
 */
const path = require('path');
const tsx = require('child_process');
tsx.execSync('node --experimental-strip-types --no-warnings -e "' +
  'import(\'./server/services/emailTemplates.ts\').then(m => {' +
  '  for (const loc of [\"vi\",\"en\",\"ja\",\"ar\"]) {' +
  '    const out = m.renderEmailTemplate(\"welcome\", loc, { name: loc === \"ja\" ? \"佐藤\" : loc === \"ar\" ? \"أحمد\" : \"Minh\" });' +
  '    console.log(\"=== \" + loc + \" ===\");' +
  '    console.log(\"subject:\", out.subject);' +
  '    console.log(\"text    :\", out.text);' +
  '    console.log(\"html len:\", out.html.length, \"bytes\");' +
  '    console.log();' +
  '  }' +
  '}).catch(e => { console.error(e); process.exit(1); });' +
  '"', { stdio: 'inherit' });