// Les erreurs de console d'une page (02/11/2026) : node outils/tav-console.mjs <url> [largeur]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [url, l = "1440"] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(l), height: 900 } });
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(m.type(), m.text().slice(0, 600)); });
p.on("pageerror", (e) => console.log("pageerror", e.message.slice(0, 600)));
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
await b.close();
