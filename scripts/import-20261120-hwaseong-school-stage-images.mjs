// Import the eight published Hwaseong school stage photographs to the website repository.
// One-time job: local image paths replace remote Naver photo URLs after successful fetch.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-11-20-hwaseong-elementary-arts-presentation-school-stage-balloon-decoration.md";
const prefix = "20261120-hwaseong-school-stage";
const uploadDir = "src/assets/uploads";
let markdown = readFileSync(casePath, "utf8");

const sources = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(match => match[0])
)];
if (sources.length !== 8) {
  throw new Error("Expected eight photo URLs, found " + sources.length);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function detect(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return "png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

async function download(url, number) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
          "Accept": "image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8",
          "Referer": "https://blog.naver.com/oneballoon_topper"
        }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const bytes = Buffer.from(await response.arrayBuffer());
      const ext = detect(bytes);
      if (!ext || bytes.length < 10000 || bytes.length > 15000000) {
        throw new Error("Not a valid image or unexpected image size: " + bytes.length);
      }
      console.log("Downloaded stage photo " + number + ": " + bytes.length + " bytes");
      return { bytes, ext };
    } catch (error) {
      console.warn("Stage photo " + number + ", attempt " + attempt + ": " + error);
      if (attempt < 4) await sleep(750 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

mkdirSync(uploadDir, { recursive: true });
for (let i = 0; i < sources.length; i++) {
  const source = sources[i];
  if (!source.startsWith("https://blogfiles.pstatic.net/")) {
    throw new Error("Unexpected source image domain");
  }
  const proxy = "https://wsrv.nl/?url=" + encodeURIComponent(source);
  const candidates = [source, source.replace("type=w1", "type=w2"), proxy];
  let saved = null;
  for (const candidate of candidates) {
    saved = await download(candidate, i + 1);
    if (saved) break;
  }
  if (!saved) throw new Error("Could not import photograph " + (i + 1));
  const filename = prefix + "-" + String(i + 1).padStart(2, "0") + "." + saved.ext;
  writeFileSync(join(uploadDir, filename), saved.bytes);
  markdown = markdown.replaceAll(source, "/assets/uploads/" + filename);
}
writeFileSync(casePath, markdown, "utf8");
console.log("Imported all eight Hwaseong school stage photographs locally.");
