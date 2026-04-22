/**
 * 将 backgrounds / cats/avatars / monsters 下 PNG 转 WebP 并限长边，减小首包体（与 bullets 同思路）。
 * 仓库根：npm install && node scripts/optimize-assets.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const WEBP_QUALITY = 86;

/** 战斗画布 720x1600，背景全屏；头像 UI 较小；怪与场上一致，略大于子弹也可 */
const JOBS = [
  { rel: "assets/backgrounds", maxSide: 1600, recursive: true },
  { rel: "assets/cats/avatars", maxSide: 512, recursive: true },
  { rel: "assets/monsters", maxSide: 768, recursive: true }
];

function* walkPng(dirAbs) {
  if (!fs.existsSync(dirAbs)) return;
  const list = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const ent of list) {
    const p = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      yield* walkPng(p);
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".png") && !ent.name.endsWith(".bak.png")) {
      yield p;
    }
  }
}

for (const job of JOBS) {
  const base = path.join(root, job.rel);
  console.log(`\n## ${job.rel} (maxSide=${job.maxSide})`);
  for (const input of walkPng(base)) {
    const outWebp = input.replace(/\.png$/i, ".webp");
    const buf = await fs.promises.readFile(input);
    const img = sharp(buf);
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    const tooBig = Math.max(w, h) > job.maxSide;
    const chain = tooBig
      ? img.resize({
          width: job.maxSide,
          height: job.maxSide,
          fit: "inside",
          withoutEnlargement: true
        })
      : img;
    await chain.webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 4 }).toFile(outWebp);
    const inSize = (await fs.promises.stat(input)).size;
    const outSize = (await fs.promises.stat(outWebp)).size;
    const rel = path.relative(root, input);
    console.log(
      `${rel}  ${w}x${h}  ${(inSize / 1024).toFixed(0)}KB -> ${path.basename(outWebp)}  ${(outSize / 1024).toFixed(0)}KB`
    );
    await fs.promises.unlink(input);
  }
}

console.log("\nDone. Bump CAT_AVATAR_ASSET_VER, MONSTER_ASSET_VER, BATTLE_BG_ASSET_VER; use .webp in index.");
