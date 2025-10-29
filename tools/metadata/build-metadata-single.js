/*
Build temporary metadata using single-image CIDs:
- COMMON_CID_A: used for variants 1..10 (commons)
- COMMON_CID_B: used for variants 11..20 (commons)
- LEGENDARY_CID: used for variants 21..40 (legendaries)

Usage (PowerShell from repo root):
$env:COMMON_CID_A="<CID>"; \
$env:COMMON_CID_B="<CID>"; \
$env:LEGENDARY_CID="<CID>"; \
node tools/metadata/build-metadata-single.js

Output: tools/metadata/dist-single/ (1.json..40.json)
*/

const fs = require("fs");
const path = require("path");

const A = process.env.COMMON_CID_A || "";
const B = process.env.COMMON_CID_B || "";
const L = process.env.LEGENDARY_CID || "";

if (!A || !B || !L) {
  console.error("Missing COMMON_CID_A or COMMON_CID_B or LEGENDARY_CID env vars.");
  process.exit(1);
}

const outDir = path.resolve(__dirname, "dist-single");
fs.mkdirSync(outDir, { recursive: true });

function commonMeta(variant, cid) {
  return {
    name: `Gashapon Common #${variant}`,
    description: "Gashapon common variant (temporary single-image metadata).",
    image: `ipfs://${cid}`,
    attributes: [
      { trait_type: "Tier", value: "Common" },
      { trait_type: "Variant", value: variant }
    ]
  };
}

function legendaryMeta(variant, cid) {
  return {
    name: `Gashapon Legendary #${variant - 20}`,
    description: "Gashapon legendary variant (temporary single-image metadata).",
    image: `ipfs://${cid}`,
    attributes: [
      { trait_type: "Tier", value: "Legendary" },
      { trait_type: "Variant", value: variant }
    ]
  };
}

// Commons 1..10 use A, 11..20 use B
for (let v = 1; v <= 10; v++) {
  fs.writeFileSync(path.join(outDir, `${v}.json`), JSON.stringify(commonMeta(v, A), null, 2));
}
for (let v = 11; v <= 20; v++) {
  fs.writeFileSync(path.join(outDir, `${v}.json`), JSON.stringify(commonMeta(v, B), null, 2));
}
// Legendaries 21..40 use L
for (let v = 21; v <= 40; v++) {
  fs.writeFileSync(path.join(outDir, `${v}.json`), JSON.stringify(legendaryMeta(v, L), null, 2));
}

console.log(`Wrote metadata JSONs to ${outDir}`);
