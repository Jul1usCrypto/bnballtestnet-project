const hre = require("hardhat");

// Usage (PowerShell):
// $env:NFT_ADDRESS="<DEPLOYED_ADDRESS>"; 
// npx hardhat run scripts/disable-vrf.js --network bsctest

async function main() {
  const addr = process.env.NFT_ADDRESS;
  if (!addr) throw new Error("Missing NFT_ADDRESS env var");

  const gash = await hre.ethers.getContractAt("Gashapon", addr);

  // Zero-out keyHash and subId to force local RNG fallback in mint()
  const coordinator = "0xDA3b641D438362C440Ac5458c57e00a712b66700"; // keep same
  const keyHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const subId = 0n;
  const callbackGas = 250000;
  const confs = 3;

  const tx = await gash.setVRFConfigV25(coordinator, keyHash, subId, callbackGas, confs);
  console.log("disable VRF tx:", tx.hash);
  await tx.wait();
  console.log("VRF disabled for future mints (local RNG fallback enabled)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
