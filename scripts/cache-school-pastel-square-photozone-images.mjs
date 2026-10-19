// Copy the six pastel square graduation / entrance photozone photos into
// the site at build time. Direct Naver blog image hotlinks may fail in browsers.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-10-19-school-graduation-entrance-pastel-square-photozone.md";
const uploadDir = "src/assets/uploads";
const nameBase = "school-pastel-square-photozone";
let markdown = readFileSync(casePath, "utf8");
const sources = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(m => m[0])
)];
if (sources.length !== 6) throw new Error("Pastel square photozone: expected six image URLs, got " + sources.length);

mkdirSync(uploadDir, { recursive: true });
function extension(data) {
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return "png";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (data.toString("ascii",0,4) === "RIFF" && data.toString("ascii",8,12) === "WEBP") return "webp";
  return null;
}
async function retrieve(url, index) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const result = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
          "Accept": "image/png,image/jpeg,image/webp,image/*;q=0.8",
          "Referer": "https://blog.naver.com/oneballoon_topper"
        }
      });
      if (!result.ok) throw new Error("HTTP " + result.status);
      const data = Buffer.from(await result.arrayBuffer());
      const ext = extension(data);
      if (!ext || data.length < 10000 || data.length > 12000000) {
        throw new Error("Invalid image data of " + data.length + " bytes");
      }
      return {data,ext};
    } catch(e) { lastError = e; }
    finally { clearTimeout(timer); }
  }
  throw new Error("Pastel photozone image " + (index+1) + " download failed: " + lastError);
}
const cached = await Promise.all(sources.map(async (url,i) => {
  const {data,ext} = await retrieve(url,i);
  const name = nameBase + "-" + String(i+1).padStart(2,"0") + "." + ext;
  writeFileSync(join(uploadDir,name),data);
  return {url,local:"/assets/uploads/" + name,bytes:data.length};
}));
for (const item of cached) markdown = markdown.replaceAll(item.url,item.local);
writeFileSync(casePath,markdown,"utf8");
console.log("Cached six school pastel square photozone images:",cached.map(x=>x.local + " ("+x.bytes+" bytes)").join(", "));
