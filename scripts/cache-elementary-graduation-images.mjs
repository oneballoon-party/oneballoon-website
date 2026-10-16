// Cache six elementary graduation case images as local website assets during build.
// Naver image hotlinks are not dependable on third-party websites.
// The source URLs point to already-sized 900px images served by Naver.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-10-16-elementary-graduation-red-gold-character-photozone.md";
const uploadDir = "src/assets/uploads";
const filenames = [
  "elementary-graduation-red-gold-cover.jpg",
  "elementary-graduation-certificate-panel.jpg",
  "elementary-graduation-congrats-wall.jpg",
  "elementary-graduation-boy-girl-characters.jpg",
  "elementary-graduation-school-hall-wide.jpg",
  "elementary-graduation-gown-photo.jpg",
];

let markdown = readFileSync(casePath, "utf8");
const urls = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(match => match[0])
)];
if (urls.length !== filenames.length) {
  throw new Error(`Elementary graduation: expected 6 unique images, found ${urls.length}`);
}

mkdirSync(uploadDir, { recursive: true });

async function fetchJpeg(url, index) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
          "Accept": "image/jpeg,image/png,image/webp,image/*;q=0.8",
          "Referer": "https://blog.naver.com/oneballoon_topper"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      if (!isJpeg || bytes.length < 10000 || bytes.length > 8000000) {
        throw new Error(`Unexpected JPEG data: ${bytes.length} bytes`);
      }
      return bytes;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Elementary graduation image ${index + 1}: ${lastError}`);
}

const results = await Promise.all(urls.map(async (url, index) => {
  const bytes = await fetchJpeg(url, index);
  writeFileSync(join(uploadDir, filenames[index]), bytes);
  return { url, localUrl: "/assets/uploads/" + filenames[index], bytes: bytes.length };
}));

for (const photo of results) {
  markdown = markdown.replaceAll(photo.url, photo.localUrl);
}
writeFileSync(casePath, markdown, "utf8");
console.log("Cached elementary graduation images:", results.map((item, index) =>
  `${filenames[index]} (${item.bytes} bytes)`).join(", "));
