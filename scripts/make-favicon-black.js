// Compone favicon-96 negro con monograma BA cobre centrado.
// Uso: node scripts/make-favicon-black.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const MONOGRAMA = path.join(ROOT, 'assets/img/logo/monograma-cobre.png');
const OUT_PNG = path.join(ROOT, 'assets/img/logo/favicon-96.png');
const OUT_ICO = path.join(ROOT, 'favicon.ico');

const SIZE = 96;
const BG = { r: 10, g: 9, b: 8, alpha: 1 }; // #0a0908 (mismo bg de la web)
const ROUND = 14; // radio de esquina
const PADDING = 0.18; // 18% de padding alrededor del monograma

async function main() {
  const inner = Math.round(SIZE * (1 - 2 * PADDING));
  const offset = Math.round((SIZE - inner) / 2);

  // Máscara de esquinas redondeadas
  const roundedMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
       <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${ROUND}" ry="${ROUND}" fill="white"/>
     </svg>`
  );

  // 1) BG negro con esquinas redondeadas
  const bg = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BG }
  })
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 2) Monograma escalado, con margen
  const mono = await sharp(MONOGRAMA)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 3) Componer
  const composed = await sharp(bg)
    .composite([{ input: mono, top: offset, left: offset }])
    .png()
    .toBuffer();

  fs.writeFileSync(OUT_PNG, composed);
  console.log('escrito', OUT_PNG, composed.length, 'bytes');

  // 4) ICO: simplemente reusamos el PNG 96 embebido (browsers lo aceptan)
  //    Para máxima compat, generamos 32×32 png y armamos un ICO manual.
  const png32 = await sharp(composed).resize(32, 32).png().toBuffer();
  const png16 = await sharp(composed).resize(16, 16).png().toBuffer();

  // Estructura ICO: header + 2 entries + 2 PNGs
  const numImages = 2;
  const headerSize = 6 + numImages * 16;
  const entries = [
    { size: 16, data: png16 },
    { size: 32, data: png32 }
  ];
  const totalSize = headerSize + entries.reduce((s, e) => s + e.data.length, 0);
  const ico = Buffer.alloc(totalSize);
  ico.writeUInt16LE(0, 0);          // reserved
  ico.writeUInt16LE(1, 2);          // type 1 = ico
  ico.writeUInt16LE(numImages, 4);  // count
  let offsetData = headerSize;
  entries.forEach((e, i) => {
    const p = 6 + i * 16;
    ico.writeUInt8(e.size === 256 ? 0 : e.size, p);      // width
    ico.writeUInt8(e.size === 256 ? 0 : e.size, p + 1);  // height
    ico.writeUInt8(0, p + 2);                            // colors
    ico.writeUInt8(0, p + 3);                            // reserved
    ico.writeUInt16LE(1, p + 4);                         // planes
    ico.writeUInt16LE(32, p + 6);                        // bpp
    ico.writeUInt32LE(e.data.length, p + 8);             // size
    ico.writeUInt32LE(offsetData, p + 12);               // offset
    e.data.copy(ico, offsetData);
    offsetData += e.data.length;
  });
  fs.writeFileSync(OUT_ICO, ico);
  console.log('escrito', OUT_ICO, ico.length, 'bytes');
}

main().catch(e => { console.error(e); process.exit(1); });
