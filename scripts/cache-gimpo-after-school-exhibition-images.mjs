// Cache photos from this published Naver Blog case during the website build.
// Browser hotlinking of blogfiles.pstatic.net may fail: save JPEGs to /assets/uploads.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-11-02-gimpo-after-school-exhibition-balloon-arch.md";
const uploadDir = "src/assets/uploads";
const prefix = "20261023-gimpo-after-school-exhibition";
let markdown = readFileSync(casePath, "utf8");
const urls = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(match => match[0])
)];
if (urls.length !== 6) throw new Error("Gimpo exhibition: expected 6 Naver images, found " + urls.length);

function imageExtension(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  return null;
}

async function fetchPhoto(url, index) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
          "Accept": "image/jpeg,image/webp,image/png,image/*;q=0.8",
          "Referer": "https://blog.naver.com/oneballoon_topper"
        }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = Buffer.from(await response.arrayBuffer());
      const ext = imageExtension(data);
      if (!ext || data.length < 10000 || data.length > 12_000_000)
        throw new Error("Invalid image bytes (" + data.length + ")");
      return { data, ext };
    } catch (e) {
      error = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Could not cache Gimpo photo " + (index + 1) + ": " + error);
}

mkdirSync(uploadDir, { recursive: true });
const cached = await Promise.all(urls.map(async (url, index) => {
  const { data, ext } = await fetchPhoto(url, index);
  const filename = prefix + "-" + String(index + 1).padStart(2, "0") + "." + ext;
  writeFileSync(join(uploadDir, filename), data);
  return { remote: url, local: "/assets/uploads/" + filename, size: data.length };
}));
for (const photo of cached) markdown = markdown.replaceAll(photo.remote, photo.local);
writeFileSync(casePath, markdown, "utf8");
console.log("Cached Gimpo after-school exhibition photos:", cached.map(x => x.local + " (" + x.size + " bytes)").join(", "));
