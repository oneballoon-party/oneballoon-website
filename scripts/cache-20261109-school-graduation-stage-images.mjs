// Cache the 12 user-published Naver Blog photos into this website during deployment.
// This matches the existing build-time photo caching used for other cases:
// never hotlink Naver-hosted photos in the final published pages.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-11-09-school-graduation-stage-and-arch.md";
const uploadDir = "src/assets/uploads";
const prefix = "20261109-school-graduation-stage-and-arch";
let markdown = readFileSync(casePath, "utf8");
const urls = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(m => m[0])
)];
if (urls.length === 0) {
  const exists = Array.from({length:12}, (_,i) => {
    const stem = prefix + "-" + String(i+1).padStart(2,"0");
    return ["png","jpg","webp"].some(ext => existsSync(join(uploadDir,stem+"."+ext)));
  });
  if (!exists.every(Boolean)) throw new Error("School graduation 20261109: expected twelve local photos");
  console.log("School graduation stage and arch photos already local.");
  process.exit(0);
}
if (urls.length !== 12) throw new Error("School graduation stage: expected 12 unique photo links, got " + urls.length);

function imageExt(data) {
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return "png";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (data.toString("ascii",0,4) === "RIFF" && data.toString("ascii",8,12) === "WEBP") return "webp";
  return null;
}

async function retrieve(url,i) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
          "Accept": "image/png,image/jpeg,image/webp,image/*;q=0.8",
          "Referer": "https://blog.naver.com/oneballoon_topper"
        }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const bytes = Buffer.from(await response.arrayBuffer());
      const ext = imageExt(bytes);
      if (!ext || bytes.length < 10000 || bytes.length > 12_000_000)
        throw new Error("Invalid image type or size " + bytes.length);
      return {bytes,ext};
    } catch(e) {lastError=e;}
    finally {clearTimeout(timeout);}
  }
  throw new Error("School graduation stage image " + (i+1) + " download failed: " + lastError);
}

mkdirSync(uploadDir, { recursive: true });
const photos = await Promise.all(urls.map(async (url,i) => {
  const {bytes,ext} = await retrieve(url,i);
  const name = prefix + "-" + String(i+1).padStart(2,"0") + "." + ext;
  writeFileSync(join(uploadDir,name), bytes);
  return {remote:url,local:"/assets/uploads/"+name,size:bytes.length};
}));
for(const p of photos) markdown = markdown.replaceAll(p.remote,p.local);
writeFileSync(casePath,markdown,"utf8");
console.log("Cached 12 school graduation stage/arch photos:", photos.map(p=>p.local+" ("+p.size+" bytes)").join(", "));
