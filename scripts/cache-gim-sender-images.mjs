// Cache the 10 Gim Sender pop-up photos as website assets during the build.
// Naver blog image URLs are not reliable for direct image embedding from another site.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-10-14-seoul-shinsegae-gangnam-gim-sender-popup.md";
const uploadDir = "src/assets/uploads";
const filenames = [
  "gim-sender-popup-01-cover.jpg",
  "gim-sender-popup-02-front.jpg",
  "gim-sender-popup-03-side.jpg",
  "gim-sender-popup-04-products.jpg",
  "gim-sender-popup-05-packages.jpg",
  "gim-sender-popup-06-merchandising.jpg",
  "gim-sender-popup-07-traditional-decor.jpg",
  "gim-sender-popup-08-artwork.jpg",
  "gim-sender-popup-09-detail.jpg",
  "gim-sender-popup-10-poster.jpg",
];

let markdown = readFileSync(casePath, "utf8");
const urls = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(match => match[0])
)];
if (urls.length !== filenames.length) {
  throw new Error(`Gim Sender: expected exactly 10 photo URLs but found ${urls.length}`);
}

mkdirSync(uploadDir, { recursive: true });

const results = await Promise.all(urls.map(async (url, i) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
        "Accept": "image/jpeg,image/png,image/webp,image/*;q=0.8",
        "Referer": "https://blog.naver.com/oneballoon_topper"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`Gim Sender image ${i + 1}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const validJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!validJpeg || bytes.length < 10000 || bytes.length > 8_000_000) {
    throw new Error(`Gim Sender image ${i + 1}: unexpected image response of ${bytes.length} bytes`);
  }
  const localPath = join(uploadDir, filenames[i]);
  writeFileSync(localPath, bytes);
  return { source: url, localUrl: "/assets/uploads/" + filenames[i], bytes: bytes.length };
}));

for (const photo of results) {
  markdown = markdown.replaceAll(photo.source, photo.localUrl);
}
writeFileSync(casePath, markdown, "utf8");
console.log("Cached Gim Sender pop-up photos:", results.map((p, i) =>
  `${filenames[i]} (${p.bytes} bytes)`).join(", "));
