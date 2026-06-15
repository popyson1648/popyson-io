/* ============================================================
   Generate the provisional 1200x630 Open Graph image.

   Dependency-free: encodes a truecolor PNG by hand (zlib is built into
   Node). Draws a navy card with the brand accent and a line-art motif as a
   placeholder. Replace public/provisional_ogp_image.png with a real social
   image before launch (and then this script can be deleted).

   Run: node scripts/make_ogp_placeholder.mjs
   ============================================================ */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const W = 1200;
const H = 630;

const NAVY = [16, 22, 42];     // #10162a  background
const ACCENT = [73, 96, 255];  // #4960ff  brand accent
const CREAM = [237, 232, 220]; // #ede8dc  text-ish

const px = Buffer.alloc(W * H * 3);

function set(x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r; px[i + 1] = g; px[i + 2] = b;
}
function fillRect(x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, color);
}

// background
fillRect(0, 0, W, H, NAVY);

// brand mark: an accent square in the upper-left
fillRect(96, 110, 96, 96, ACCENT);

// "line-art" name plate: a few horizontal bars of decreasing length,
// evoking the site's "thinking in lines" identity (placeholder for text).
fillRect(96, 250, 660, 56, CREAM); // big bar (site name)
fillRect(96, 348, 420, 22, ACCENT); // tagline accent line
fillRect(96, 392, 300, 22, [120, 132, 168]); // muted line

// thin baseline rule across the card
fillRect(96, 520, W - 192, 4, ACCENT);

// ---- PNG encoding ----
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "latin1");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 2;  // color type: truecolor RGB
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// raw scanlines: each row prefixed with filter byte 0
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  const src = y * W * 3;
  const dst = y * (1 + W * 3);
  raw[dst] = 0;
  px.copy(raw, dst + 1, src, src + W * 3);
}
const idat = deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  signature,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(ROOT, "public");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "provisional_ogp_image.png");
writeFileSync(outPath, png);
console.log(`[ogp] wrote ${outPath} (${W}x${H}, ${png.length} bytes)`);
