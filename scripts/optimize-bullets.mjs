/**
 * 将 assets/bullets 下的大 PNG 缩放到屏幕所需上限并转 WebP，显著减小首包体。
 * 跑前备份：在仓库根执行 npm install && node scripts/optimize-bullets.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dir = path.join(root, "assets", "bullets");
/** 战斗中绘制尺寸约几十~百余像素；768 已足够 2x 屏，再大只会拖慢加载 */
const MAX_SIDE = 768;
const WEBP_QUALITY = 86;

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".png") && !f.endsWith(".bak.png"))
  .sort();

for (const f of files) {
  const input = path.join(dir, f);
  const outWebp = path.join(dir, f.replace(/\.png$/i, ".webp"));
  const buf = await fs.promises.readFile(input);
  const img = sharp(buf);
  const meta = await img.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const needsResize = Math.max(w, h) > MAX_SIDE;
  let chain = needsResize
    ? img.resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: "inside",
        withoutEnlargement: true
      })
    : img;
  await chain.webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 4 }).toFile(outWebp);
  const inSize = (await fs.promises.stat(input)).size;
  const outSize = (await fs.promises.stat(outWebp)).size;
  console.log(
    `${f}  ${w}x${h}  ${(inSize / 1024).toFixed(0)}KB -> ${path.basename(outWebp)}  ${(outSize / 1024).toFixed(0)}KB`
  );
}

console.log("Done. Update index: bulletSrc uses .webp, bump BULLET_ASSET_VER.");
