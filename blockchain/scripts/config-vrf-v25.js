const hre = require("hardhat");

// Usage (PowerShell):
// $env:NFT_ADDRESS="<DEPLOYED_ADDRESS>"; \
// $env:SUB_ID="<LONG_SUBSCRIPTION_ID_STRING>"; \
// npx hardhat run scripts/config-vrf-v25.js --network bsctest

async function main() {
  const addr = process.env.NFT_ADDRESS;
  const subId = process.env.SUB_ID; // string OK, contract expects uint256
  if (!addr || !subId) throw new Error("Missing NFT_ADDRESS or SUB_ID env var");

  const coordinator = "0xDA3b641D438362C440Ac5458c57e00a712b66700"; // BSC testnet v2.5
  const keyHash = "0x8596b430971ac45bdf6088665b9ad8e8630c9d5049ab54b14dff711bee7c0e26"; // BSC testnet gas lane

  const gash = await hre.ethers.getContractAt("Gashapon", addr);

  const tx1 = await gash.setVRFConfigV25(
    coordinator,
    keyHash,
    BigInt(subId),
    250000,
    3
  );
  console.log("setVRFConfigV25 tx:", tx1.hash);
  await tx1.wait();

  // Keep jackpot gate at 60%
  const tx2 = await gash.setJackpotMintPercent(60);
  console.log("setJackpotMintPercent(60) tx:", tx2.hash);
  await tx2.wait();

  console.log("VRF v2.5 configured and jackpot gating set.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
