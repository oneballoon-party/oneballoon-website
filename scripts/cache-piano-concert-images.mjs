// Cache the seven piano concert photozone and grand piano stage photos during deployment.
// Naver Blog image URLs can be blocked as hotlinks, so publish local files in /assets/uploads.
// All source links come from the user's published Naver blog images.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-10-24-piano-concert-photozone-and-stage-balloons.md";
const uploadDir = "src/assets/uploads";
let markdown = readFileSync(casePath, "utf8");
const sources = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(match => match[0])
)];
if (sources.length !== 7) {
  throw new Error("Piano concert: expected seven unique photos, found " + sources.length);
}

function extension(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP") return "webp";
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
          "Accept": "image/webp,image/jpeg,image/png,image/*;q=0.8",
          "Referer": "https://blog.naver.com/oneballoon_topper"
        }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const bytes = Buffer.from(await response.arrayBuffer());
      const ext = extension(bytes);
      if (!ext || bytes.length < 10000 || bytes.length > 12_000_000) {
        throw new Error("Invalid photo content: " + bytes.length + " bytes");
      }
      return { bytes, ext };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Piano concert photo " + (index+1) + " failed: " + lastError);
}

mkdirSync(uploadDir, { recursive: true });
const images = await Promise.all(sources.map(async (url, index) => {
  const { bytes, ext } = await downloadPhoto(url, index);
  const filename = "piano-concert-20261021-" + String(index+1).padStart(2, "0") + "." + ext;
  writeFileSync(join(uploadDir, filename), bytes);
  return { source: url, local: "/assets/uploads/" + filename, bytes: bytes.length };
}));
for (const photo of images) markdown = markdown.replaceAll(photo.source, photo.local);
writeFileSync(casePath, markdown, "utf8");
console.log("Cached piano concert photos:", images.map(p => p.local + " (" + p.bytes + " bytes)").join(", "));
