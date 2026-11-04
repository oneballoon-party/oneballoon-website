// Import photos for the Incheon Global Startup School exhibition case into this repository.
// Naver Blog image hotlinks may not load when embedded on another website.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-11-04-incheon-global-startup-school-expo-booth.md";
const uploadDir = "src/assets/uploads";
const prefix = "20261014-incheon-global-startup-school-booth";
let markdown = readFileSync(casePath, "utf8");
const urls = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(match => match[0])
)];
if (urls.length === 0) {
  const cached = existsSync(uploadDir) ? readdirSync(uploadDir).filter(name => name.startsWith(prefix + "-") && /\.(jpe?g|webp|png)$/i.test(name)) : [];
  if (cached.length !== 5) throw new Error("Expected 5 local Incheon expo photos, found " + cached.length);
  console.log("Already imported local photos:", cached);
  process.exit(0);
}
if (urls.length !== 5) throw new Error("Expected 5 external photo links, found " + urls.length);

function extension(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  return null;
}
async function download(url,index) {
  let lastError;
  for (let attempt=0; attempt<4; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),30000);
    try {
      const res=await fetch(url,{signal:controller.signal,headers:{
        "User-Agent":"Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
        "Accept":"image/jpeg,image/webp,image/png,image/*;q=0.8",
        "Referer":"https://blog.naver.com/oneballoon_topper"
      }});
      if(!res.ok) throw new Error("HTTP "+res.status);
      const data=Buffer.from(await res.arrayBuffer());
      const ext=extension(data);
      if(!ext||data.length<10000||data.length>12000000) throw new Error("Invalid image bytes "+data.length);
      return {data,ext};
    } catch(e){lastError=e} finally {clearTimeout(timer)}
  }
  throw new Error("Cannot download Incheon booth photo "+(index+1)+": "+lastError);
}
mkdirSync(uploadDir,{recursive:true});
const cached=await Promise.all(urls.map(async(url,i)=>{
  const {data,ext}=await download(url,i);
  const name=prefix+"-"+String(i+1).padStart(2,"0")+"."+ext;
  writeFileSync(join(uploadDir,name),data);
  return {remote:url,local:"/assets/uploads/"+name,bytes:data.length};
}));
for (const img of cached) markdown=markdown.replaceAll(img.remote,img.local);
writeFileSync(casePath,markdown,"utf8");
console.log("Stored 5 Incheon exhibition photos:",cached.map(x=>x.local+" ("+x.bytes+" bytes)"));
