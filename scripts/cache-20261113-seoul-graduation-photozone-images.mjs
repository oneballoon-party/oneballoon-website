// Cache this Seoul graduation photozone's five Naver Blog photos at build time.
// The deployed site serves photos from its own /assets/uploads/ path, avoiding
// browsers hotlinking blogfiles.pstatic.net (which can fail).
import {readFileSync, writeFileSync, mkdirSync, existsSync} from "node:fs";
import {join} from "node:path";

const casePath = "src/cases/2026-11-13-seoul-graduation-navy-gold-photozone.md";
const uploadDir = "src/assets/uploads";
const prefix = "20261113-seoul-navy-gold-graduation-photozone";
let markdown = readFileSync(casePath, "utf8");
const urls = [...new Set(
  [...markdown.matchAll(/https:\/\/blogfiles\.pstatic\.net\/[^"\s]+/g)].map(m => m[0])
)];

if (urls.length === 0) {
  const found = Array.from({length:5}, (_,i) => {
    const stem = prefix + "-" + String(i+1).padStart(2,"0");
    return ["jpg","png","webp"].some(ext => existsSync(join(uploadDir,stem+"."+ext)));
  });
  if (!found.every(Boolean)) throw new Error("Seoul graduation: missing cached images");
  console.log("Seoul graduation photos already available locally.");
  process.exit(0);
}
if (urls.length !== 5) throw new Error("Expected five Seoul graduation images, got "+urls.length);

function ext(bytes) {
  if (bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return "jpg";
  if (bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e) return "png";
  if (bytes.toString("ascii",0,4)==="RIFF" && bytes.toString("ascii",8,12)==="WEBP") return "webp";
  return null;
}

async function download(url,i) {
  let lastError;
  for (let attempt=0;attempt<3;attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),30000);
    try {
      const r=await fetch(url,{signal:controller.signal,headers:{
        "User-Agent":"Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
        "Accept":"image/jpeg,image/png,image/webp,image/*;q=0.8",
        "Referer":"https://blog.naver.com/oneballoon_topper"
      }});
      if(!r.ok) throw new Error("HTTP "+r.status);
      const bytes=Buffer.from(await r.arrayBuffer());
      const suffix=ext(bytes);
      if(!suffix || bytes.length<10000 || bytes.length>12000000)
        throw new Error("Unexpected image type or size "+bytes.length);
      return {bytes,suffix};
    } catch(err) {lastError=err;}
    finally {clearTimeout(timeout);}
  }
  throw new Error("Seoul graduation image "+(i+1)+" could not be downloaded: "+lastError);
}

mkdirSync(uploadDir,{recursive:true});
const cached=await Promise.all(urls.map(async (url,i)=>{
  const {bytes,suffix}=await download(url,i);
  const name=prefix+"-"+String(i+1).padStart(2,"0")+"."+suffix;
  writeFileSync(join(uploadDir,name),bytes);
  return {remote:url,local:"/assets/uploads/"+name,size:bytes.length};
}));
for(const photo of cached) markdown=markdown.replaceAll(photo.remote,photo.local);
writeFileSync(casePath,markdown,"utf8");
console.log("Cached Seoul graduation images:",cached.map(p=>p.local+" ("+p.size+"B)").join(", "));
