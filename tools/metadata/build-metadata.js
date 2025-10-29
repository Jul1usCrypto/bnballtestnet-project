/*
Usage (PowerShell):
# Set the base IPFS CIDs for your already-pinned images
$env:COMMON_CID="<IPFS_CID_FOR_COMMON_IMAGES>"; \
$env:LEGENDARY_CID="<IPFS_CID_FOR_LEGENDARY_IMAGES>"; \
node tools/metadata/build-metadata.js

Outputs JSON files into tools/metadata/dist/
- 1..20 -> common variants (image: ipfs://COMMON_CID/<variant>.png)
- 21..40 -> legendary variants (image: ipfs://LEGENDARY_CID/<legendIndex>.png where legendIndex = variant-20)

After pinning the metadata folder to IPFS, take the resulting CID and run set-baseuri.js to update the contract.
*/

const fs = require("fs");
const path = require("path");

const COMMON_CID = process.env.COMMON_CID || "";
const LEGENDARY_CID = process.env.LEGENDARY_CID || "";

if (!COMMON_CID || !LEGENDARY_CID) {
  console.error("Missing COMMON_CID or LEGENDARY_CID env vars.");
  process.exit(1);
}

const outDir = path.resolve(__dirname, "dist");
fs.mkdirSync(outDir, { recursive: true });

function metadataForCommon(variant) {
  return {
    name: `Gashapon Common #${variant}`,
    description:
      "Gashapon common variant. Collect all 20 variants (five each) to mint a Legendary.",
    image: `ipfs://${COMMON_CID}/${variant}.png`,
    attributes: [
      { trait_type: "Tier", value: "Common" },
      { trait_type: "Variant", value: variant }
    ]
  };
}

function metadataForLegendary(legendIndex) {
  return {
    name: `Gashapon Legendary #${legendIndex}`,
    description:
      "Gashapon legendary variant. Collect all 20 legendary variants to unlock the jackpot key.",
    image: `ipfs://${LEGENDARY_CID}/${legendIndex}.png`,
    attributes: [
      { trait_type: "Tier", value: "Legendary" },
      { trait_type: "Variant", value: 20 + legendIndex }
    ]
  };
}

// Write 1..20 (common)
for (let v = 1; v <= 20; v++) {
  const meta = metadataForCommon(v);
  fs.writeFileSync(path.join(outDir, `${v}.json`), JSON.stringify(meta, null, 2));
}
// Write 21..40 (legendary)
for (let v = 21; v <= 40; v++) {
  const idx = v - 20;
  const meta = metadataForLegendary(idx);
  fs.writeFileSync(path.join(outDir, `${v}.json`), JSON.stringify(meta, null, 2));
}

// Optionally write a metadata.json index
const index = {
  common: Array.from({ length: 20 }, (_, i) => i + 1),
  legendary: Array.from({ length: 20 }, (_, i) => i + 21)
};
fs.writeFileSync(path.join(outDir, `index.json`), JSON.stringify(index, null, 2));

console.log(`Wrote metadata JSONs to ${outDir}`);
