// Cache the seven photos from the 2026-11-11 blue/silver school graduation case.
// The published website serves local assets rather than hotlinking Naver images.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-11-11-blue-silver-school-graduation-stage-balloon-arch.md";
const uploadDir = "src/assets/uploads";
const prefix = "20261111-blue-silver-school-graduation";
let markdown = readFileSync(casePath, "utf8");
const urls = [...new Set([...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(m => m[0]))];
if (urls.length === 0) {
  const found = Array.from({length: 7}, (_, i) => {
    const stem = prefix + "-" + String(i + 1).padStart(2, "0");
    return ["png", "jpg", "webp"].some(ext => existsSync(join(uploadDir, stem + "." + ext)));
  });
  if (!found.every(Boolean)) throw new Error("Blue/silver graduation: expected seven locally cached photos");
  console.log("Blue/silver graduation photographs already local.");
  process.exit(0);
}
if (urls.length !== 7) throw new Error("Expected 7 unique graduation photo URLs; received " + urls.length);

function imageExtension(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}
async function getImage(url, n) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
          "Accept": "image/png,image/jpeg,image/webp,image/*;q=0.8",
          "Referer": "https://blog.naver.com/oneballoon_topper"
        }
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const bytes = Buffer.from(await res.arrayBuffer());
      const ext = imageExtension(bytes);
      if (!ext || bytes.length < 10000 || bytes.length > 12000000)
        throw new Error("Unexpected image data (" + bytes.length + " bytes)");
      return {bytes, ext};
    } catch (error) { lastError = error; }
    finally { clearTimeout(timeout); }
  }
  throw new Error("Could not retrieve image " + (n + 1) + ": " + lastError);
}
mkdirSync(uploadDir, { recursive: true });
const photos = await Promise.all(urls.map(async (url, i) => {
  const {bytes, ext} = await getImage(url, i);
  const filename = prefix + "-" + String(i + 1).padStart(2, "0") + "." + ext;
  writeFileSync(join(uploadDir, filename), bytes);
  return {remote: url, local: "/assets/uploads/" + filename, size: bytes.length};
}));
for (const photo of photos) markdown = markdown.replaceAll(photo.remote, photo.local);
writeFileSync(casePath, markdown, "utf8");
console.log("Cached blue/silver graduation images:", photos.map(p => p.local + " (" + p.size + "B)").join(", "));
