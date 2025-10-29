const hre = require("hardhat");

// Usage (PowerShell):
// $env:NFT_ADDRESS="0x..."; \
// $env:BASE_URI="ipfs://<METADATA_CID>/"; \
// npx hardhat run scripts/set-baseuri.js --network bsctest

async function main() {
  const addr = process.env.NFT_ADDRESS;
  const base = process.env.BASE_URI;
  if (!addr || !base) throw new Error("Missing NFT_ADDRESS or BASE_URI env var");

  const gash = await hre.ethers.getContractAt("Gashapon", addr);
  const tx = await gash.setBaseURI(base);
  console.log("setBaseURI tx:", tx.hash);
  await tx.wait();
  console.log("Base URI set to:", base);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
