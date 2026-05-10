import puppeteer from 'puppeteer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const htmlPath = join(__dirname, 'manual.html')
const outPath  = join(__dirname, '..', 'public', 'CourtBook-User-Manual.pdf')

if (!existsSync(htmlPath)) {
  console.error('manual.html not found at', htmlPath)
  process.exit(1)
}

console.log('🚀 Launching browser…')
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const page = await browser.newPage()

// Load the HTML file directly (file:// protocol)
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
  waitUntil: 'networkidle0',
  timeout: 30_000,
})

// Wait for fonts / layout to settle
await new Promise(r => setTimeout(r, 1500))

console.log('📄 Generating PDF…')
await page.pdf({
  path: outPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;display:flex;justify-content:space-between;align-items:center;
                padding:0 64px;font-size:8pt;color:#9ca3af;font-family:Inter,sans-serif;
                border-top:1px solid #f3f4f6;">
      <span>CourtBook User Manual</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
})

await browser.close()
console.log(`✅ PDF saved to: ${outPath}`)
