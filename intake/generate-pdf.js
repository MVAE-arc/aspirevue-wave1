// generate-pdf.js
// Reads data.yaml, renders a print-optimized A4 template via Puppeteer, writes companion.pdf.
// Run: node generate-pdf.js

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DATA_PATH = path.join(__dirname, 'data.yaml');
const OUTPUT_PATH = path.join(__dirname, 'companion.pdf');

// Simple YAML parser fallback if js-yaml isn't available
function loadYaml() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  try {
    return yaml.load(raw);
  } catch (e) {
    throw new Error('YAML parse failed. Ensure js-yaml is installed: npm install js-yaml\n' + e.message);
  }
}

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

function ruledLines(count) {
  // 8 ruled lines at 10mm baseline-to-baseline, drawn as divs with bottom border.
  // 0.25pt stroke = ~0.33px; closest CSS integer is 1px at this size, so we use 0.5px.
  const lines = [];
  for (let i = 0; i < count; i++) {
    lines.push('<div class="ruled-line"></div>');
  }
  return lines.join('');
}

function buildHtml(data) {
  const sections = data.sections || [];

  // Section number mapping:
  // Inventory => 01, Sharp Pains => 01, Chronic Bleeds => 01,
  // Patterns => 02, Triggers => 02, Memory => 03, Open Questions => no numeral
  function getLayerNumeral(sec) {
    if (sec.layer_numeral) return sec.layer_numeral;
    return '';
  }

  let sectionsHtml = '';
  for (const sec of sections) {
    const numeral = getLayerNumeral(sec);
    const numeralHtml = numeral
      ? `<span class="section-numeral">${numeral}</span>`
      : '';

    let promptsHtml = '';
    for (const prompt of (sec.prompts || [])) {
      const lineCount = prompt.field_type === 'short' ? 3 : 8;
      promptsHtml += `
        <div class="pdf-prompt">
          <div class="prompt-label">${escHtml(prompt.sub_label)}</div>
          <div class="prompt-text">${escHtml(prompt.text)}</div>
          <div class="ruled-block">${ruledLines(lineCount)}</div>
        </div>`;
    }

    sectionsHtml += `
      <div class="pdf-section">
        <div class="section-header">
          <div class="section-rule"></div>
          <div class="section-meta">
            <div class="section-layer-label">${escHtml(sec.layer_label)}</div>
            ${numeralHtml}
          </div>
          <h2 class="section-heading">${escHtml(sec.title)}</h2>
          <p class="section-preamble">${escHtml(sec.preamble)}</p>
        </div>
        ${promptsHtml}
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=block" rel="stylesheet">
<style>
@charset "UTF-8";

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;
  font-size: 13pt;
  line-height: 1.6;
  color: #263238;
  background: #ffffff;
}

/* Cover / title block */
.pdf-cover {
  padding: 0 0 20mm 0;
  border-bottom: 1pt solid #263238;
  margin-bottom: 14mm;
}

.pdf-brand {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 9pt;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8A9BA8;
  margin-bottom: 12mm;
}

.pdf-title {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 28pt;
  line-height: 1.05;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: #263238;
  margin-bottom: 6mm;
}

.pdf-subtitle {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 500;
  font-size: 13pt;
  color: #546E7A;
  margin-bottom: 8mm;
}

.pdf-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8A9BA8;
}

/* Sections */
.pdf-section {
  page-break-inside: avoid;
  break-inside: avoid;
  margin-bottom: 0;
}

.section-header {
  page-break-inside: avoid;
  break-inside: avoid;
  margin-bottom: 8mm;
}

.section-rule {
  width: 100%;
  height: 1pt;
  background: #263238;
  margin-bottom: 6mm;
  margin-top: 14mm;
}

/* First section: no top gap (cover already provides it) */
.pdf-section:first-child .section-rule {
  margin-top: 0;
}

.section-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4mm;
}

.section-layer-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8A9BA8;
}

.section-numeral {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8pt;
  color: #9E9E9E;
  letter-spacing: 0.04em;
}

.section-heading {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 18pt;
  line-height: 1.05;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: #263238;
  margin-bottom: 5mm;
}

.section-preamble {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 500;
  font-size: 13pt;
  line-height: 1.6;
  color: #263238;
  max-width: 62ch;
  margin-bottom: 6mm;
}

/* Prompts */
.pdf-prompt {
  page-break-inside: avoid;
  break-inside: avoid;
  margin-bottom: 8mm;
  padding-left: 0;
}

.prompt-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8A9BA8;
  margin-bottom: 3mm;
}

.prompt-text {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 500;
  font-size: 13pt;
  line-height: 1.6;
  color: #263238;
  margin-bottom: 5mm;
  padding-left: 8mm;
  max-width: 60ch;
}

/* Ruled lines: 8 lines, 10mm leading, 0.25pt stroke (#D9D9D9) */
.ruled-block {
  padding-left: 8mm;
}

.ruled-line {
  height: 10mm;
  border-bottom: 0.5px solid #D9D9D9;
}

/* Page numbers via @page counter */
@page {
  size: A4;
  margin-top: 20mm;
  margin-bottom: 16mm;
  margin-right: 22mm;
  margin-left: 14mm;

  @bottom-right {
    content: counter(page);
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    color: #8A9BA8;
  }
}

/* Force page break before each section (except first) */
.pdf-section + .pdf-section .section-rule {
  page-break-before: always;
  break-before: always;
}
</style>
</head>
<body>

<div class="pdf-cover">
  <div class="pdf-brand">Arc'kin Endeavors · AspireVue</div>
  <div class="pdf-title">Day 00 Intake</div>
  <div class="pdf-subtitle">In your words.</div>
  <div class="pdf-meta">Seven sections · Return to any section · Sloppy is fine</div>
</div>

${sectionsHtml}

</body>
</html>`;
}

async function run() {
  console.log('Reading data.yaml...');
  let data;
  try {
    data = loadYaml();
  } catch (e) {
    console.error('Failed to load data.yaml:', e.message);
    process.exit(1);
  }

  const html = buildHtml(data);

  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set content and wait for fonts to load
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Additional wait to ensure Google Fonts render
  await new Promise(r => setTimeout(r, 2000));

  console.log('Generating PDF...');
  await page.pdf({
    path: OUTPUT_PATH,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '16mm',
      right: '22mm',
      left: '14mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="width:100%;font-family:monospace;font-size:8pt;color:#8A9BA8;
                  padding:0 22mm 0 14mm;display:flex;justify-content:flex-end;">
        <span class="pageNumber"></span>
      </div>`
  });

  await browser.close();
  console.log('companion.pdf written to', OUTPUT_PATH);
}

run().catch(err => {
  console.error('PDF generation failed:', err.message);
  process.exit(1);
});
