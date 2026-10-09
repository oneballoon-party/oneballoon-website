// Download only the book-style graduation photo zone case images at build time.
// This avoids blocked external image hotlinks in the published website.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-10-09-학교-졸업식-책모양-포토존-풍선장식.md";
const dir = "src/assets/uploads";
const names = [
  "book-graduation-cover.jpg",
  "book-graduation-front.jpg",
  "book-graduation-left-angle.jpg",
  "book-graduation-purple.jpg",
  "book-graduation-pink.jpg",
  "book-graduation-right-angle.jpg",
  "book-graduation-wide.jpg",
  "book-graduation-people.jpg",
];

let markdown = readFileSync(casePath, "utf8");
const matches = [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(x => x[0]);
const urls = [...new Set(matches)];
if (urls.length !== names.length) {
  throw new Error(`Expected 8 book graduation images, found ${urls.length}; refusing incomplete publication`);
}

mkdirSync(dir, { recursive: true });
const results = await Promise.all(urls.map(async (url, i) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let resp;
  try {
    resp = await fetch(url, {
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
  if (!resp.ok) throw new Error(`Photo ${i+1}: Naver returned HTTP ${resp.status}`);
  const contentType = resp.headers.get("content-type") || "";
  const bytes = Buffer.from(await resp.arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!jpeg) throw new Error(`Photo ${i+1}: expected JPEG, got ${contentType}; bytes ${bytes.length}`);
  if (bytes.length < 10000 || bytes.length > 8_000_000) throw new Error(`Photo ${i+1}: invalid size ${bytes.length}`);
  const path = join(dir, names[i]);
  writeFileSync(path, bytes);
  return { url, localUrl: `/assets/uploads/${names[i]}`, bytes: bytes.length };
}));
for (const item of results) markdown = markdown.replaceAll(item.url, item.localUrl);
writeFileSync(casePath, markdown, "utf8");
console.log("Stored book-style graduation image assets locally for deployment:",
  results.map((r,i)=>`${names[i]} (${r.bytes} bytes)`).join(", "));
