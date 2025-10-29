const hre = require("hardhat");

// Usage (PowerShell):
// $env:NFT_ADDRESS="<DEPLOYED_ADDRESS>"; $env:PRICE_WEI="0"; 
// npx hardhat run scripts/set-price.js --network bsctest

async function main() {
  const addr = process.env.NFT_ADDRESS;
  const priceWei = process.env.PRICE_WEI;
  if (!addr || priceWei === undefined) throw new Error("Missing NFT_ADDRESS or PRICE_WEI env var");

  const g = await hre.ethers.getContractAt("Gashapon", addr);
  const tx = await g.setPrice(BigInt(priceWei));
  console.log("setPrice tx:", tx.hash);
  await tx.wait();
  console.log("Price set to", priceWei);
}

main().catch((e) => { console.error(e); process.exit(1); });
