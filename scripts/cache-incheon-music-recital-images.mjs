// Download the 7 photos that the user published on Naver Blog and serve them as local website assets.
// Blog CDN hotlinks can be blocked, so the public case uses /assets/uploads/ paths instead.
import {mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";

const photos = [
  {
    "filename": "incheon-music-recital-20261024-01.jpg",
    "url": "https://blogfiles.pstatic.net/MjAyNjEwMjZfMjky/MDAxNzkzMDE3NTU2NjY3.fzDHbaGgcsK4hN7H67vweV9LEKXLRzpsxnZOY0C9MFsg.V_gw2zXiyh7bDtONcPndXVXkqLUYozju-G8oWZ_5y5Yg.JPEG/900_20261024_%ED%94%BC%EC%95%84%EB%85%B8%EB%B0%9C%ED%91%9C%ED%9A%8C%ED%8F%AC%ED%86%A0%EC%A1%B4_07.jpg?type=w1"
  },
  {
    "filename": "incheon-music-recital-20261024-02.jpg",
    "url": "https://blogfiles.pstatic.net/MjAyNjEwMjZfMzIg/MDAxNzkzMDE3NTU1NDI0.3bNkXXRIkYAMGa8tYPt7SfV2aSPpj0LKAdUfZtZ99rEg.rW4FLklHwZjCjwt8WSfsP6RWiRXNsXl9t7PDAf-4a1Ag.JPEG/900_20261024_%EC%9D%8C%EC%95%85%ED%95%99%EC%9B%90%EC%97%B0%EC%A3%BC%ED%9A%8C%ED%8F%AC%ED%86%A0%EC%A1%B4_01.jpg?type=w1"
  },
  {
    "filename": "incheon-music-recital-20261024-03.jpg",
    "url": "https://blogfiles.pstatic.net/MjAyNjEwMjZfMTA3/MDAxNzkzMDE3NTU0MTQ3.qChDWqudXtAjzbp93ZHq7R1ExaBJGQ7zkfqUHqOqjfwg.BKMGUUlkpRJgrsZWTSNQUu4HNa_O4pcyMxYJt3sjGRUg.JPEG/900_20261024_%EB%B8%94%EB%9E%99%EC%8B%A4%EB%B2%84%ED%92%8D%EC%84%A0%EC%9E%A5%EC%8B%9D_03.jpg?type=w1"
  },
  {
    "filename": "incheon-music-recital-20261024-04.jpg",
    "url": "https://blogfiles.pstatic.net/MjAyNjEwMjZfMzcg/MDAxNzkzMDE3NTU1NDI1.NmCsblXR_4Rv_G88lSNZDl-6dmeeOncjt1k1LDlYj64g.21jHPQPgoOVwNgDEz78D1bEXgjgr3jMPqWBeiWTVDOYg.JPEG/900_20261024_%EC%95%BC%EC%99%B8%EC%9D%8C%EC%95%85%ED%9A%8C%ED%92%8D%EC%84%A0%EC%9E%A5%EC%8B%9D_02.jpg?type=w1"
  },
  {
    "filename": "incheon-music-recital-20261024-05.jpg",
    "url": "https://blogfiles.pstatic.net/MjAyNjEwMjZfMTky/MDAxNzkzMDE3NTU2NTEz.7g7LWMA2HzQVblymt2D7ms87ws7qySQV0f_l-zrAHO8g.IzBduiJtZg7EcdQLf1OGiLofSQtoeES0vvUL-NzqVO4g.JPEG/900_20261024_%EB%86%92%EC%9D%80%EC%9D%8C%EC%9E%90%EB%A6%AC%ED%91%9C%ED%8F%AC%ED%86%A0%EC%A1%B4_05.jpg?type=w1"
  },
  {
    "filename": "incheon-music-recital-20261024-06.jpg",
    "url": "https://blogfiles.pstatic.net/MjAyNjEwMjZfMTQy/MDAxNzkzMDE3NTU3ODM5.ytbGVq0jAmGfwg6pbVMQ0y9bh4Gf7NwXLFJKW8A-myMg.iQvyOO6ExKaZQFxqhaU5uqWE_0q2WoxTx1Pir18jMRIg.JPEG/900_20261024_%ED%99%80%EB%A1%9C%EA%B7%B8%EB%9E%A8%ED%8F%AC%ED%86%A0%EC%9B%94_04.jpg?type=w1"
  },
  {
    "filename": "incheon-music-recital-20261024-07.jpg",
    "url": "https://blogfiles.pstatic.net/MjAyNjEwMjZfMjA1/MDAxNzkzMDE3NTUzNzky.tmLi4zL6Nfx5lSLHT-temoWXSQi3fbgDD3u-jHvhPYwg.Zr-a_YVlubFtaBs5K6p0vX7j6aDZxdl6s5UJIICw6dgg.JPEG/900_20261024_%EC%9D%8C%EC%95%85%ED%9A%8C%ED%8F%AC%ED%86%A0%EC%A1%B4%EC%9E%A5%EC%8B%9D_06.jpg?type=w1"
  }
];
const outDir = "src/assets/uploads";
mkdirSync(outDir, {recursive: true});

async function getPhoto(photo) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(photo.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
          "Accept": "image/jpeg,image/png,image/webp,image/*;q=0.8",
          "Referer": "https://blog.naver.com/oneballoon_topper"
        }
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length < 10000 || bytes.length > 12000000 ||
          bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
        throw new Error("Not a usable JPEG: " + bytes.length + " bytes");
      }
      writeFileSync(join(outDir, photo.filename), bytes);
      return bytes.length;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Could not cache " + photo.filename + ": " + lastError);
}

const results = await Promise.all(photos.map(async photo =>
  photo.filename + " (" + await getPhoto(photo) + " bytes)"
));
console.log("Cached Incheon recital photos:", results.join(", "));
