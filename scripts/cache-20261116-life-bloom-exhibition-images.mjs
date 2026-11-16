// Cache the six Incheon life-bloom poster exhibition photos during deployment.
// Browsers may block direct image hotlinks from blogfiles.pstatic.net.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-11-16-incheon-yeongjong-life-bloom-poster-exhibition.md";
const uploadDir = "src/assets/uploads";
const prefix = "20261116-incheon-life-bloom-exhibition";
let markdown = readFileSync(casePath, "utf8");
const urls = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(match => match[0])
)];

if (urls.length === 0) {
  const present = Array.from({length: 6}, (_, i) => {
    const stem = prefix + "-" + String(i + 1).padStart(2, "0");
    return ["jpg", "png", "webp"].some(ext => existsSync(join(uploadDir, stem + "." + ext)));
  });
  if (!present.every(Boolean)) throw new Error("Life-bloom exhibition: local photo assets are missing.");
  console.log("Life-bloom exhibition photos are already cached.");
  process.exit(0);
}
if (urls.length !== 6) {
  throw new Error("Life-bloom exhibition: expected six photo URLs, got " + urls.length);
}

function imageExt(data) {
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e) return "png";
  if (data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

async function downloadPhoto(url, index) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
          "Accept": "image/jpeg,image/png,image/webp,image/*;q=0.8",
          "Referer": "https://blog.naver.com/oneballoon_topper"
        }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const bytes = Buffer.from(await response.arrayBuffer());
      const ext = imageExt(bytes);
      if (!ext || bytes.length < 10000 || bytes.length > 12000000) {
        throw new Error("Unexpected image data: " + bytes.length + " bytes");
      }
      return { bytes, ext };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Life-bloom photo " + (index + 1) + " download failed: " + lastError);
}

mkdirSync(uploadDir, { recursive: true });
const cached = await Promise.all(urls.map(async (url, i) => {
  const { bytes, ext } = await downloadPhoto(url, i);
  const filename = prefix + "-" + String(i + 1).padStart(2, "0") + "." + ext;
  writeFileSync(join(uploadDir, filename), bytes);
  return { remote: url, local: "/assets/uploads/" + filename, bytes: bytes.length };
}));

for (const image of cached) {
  markdown = markdown.replaceAll(image.remote, image.local);
}
writeFileSync(casePath, markdown, "utf8");
console.log("Cached six Incheon exhibition images:",
  cached.map(p => p.local + " (" + p.bytes + " bytes)").join(", "));
