const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SVG_PATH = path.join(__dirname, "../frontend/assets/icon/mendly-icon-full-dark-bg.svg");
const OUT_DIR = path.join(__dirname, "../frontend/assets/icon");

async function generate() {
  const svg = fs.readFileSync(SVG_PATH, "utf8");
  const browser = await chromium.launch();
  const sizes = [192, 512];

  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const html = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;}</style></head><body>${svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`)}</body></html>`;
    await page.setContent(html);
    await page.screenshot({ path: path.join(OUT_DIR, `pwa-${size}.png`), omitBackground: true });
    await page.close();
    console.log(`Generated: pwa-${size}.png`);
  }

  await browser.close();
  console.log("Done!");
}

generate().catch((e) => { console.error(e); process.exit(1); });
