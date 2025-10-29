const hre = require("hardhat");

async function main() {
  const payment = process.env.BNBALL_TOKEN || "0x84B96083bF2d017bB93743429Ea936FEf665FA0b";
  const price = process.env.MINT_PRICE || "1"; // keep 1 wei default for testing
  const baseURI = process.env.BASE_URI || "";
  const coordinator = process.env.VRF_COORDINATOR || "0xDA3b641D438362C440Ac5458c57e00a712b66700"; // not used unless VRF is configured

  const G = await hre.ethers.getContractFactory("GashaponV2");
  const g = await G.deploy(payment, price, baseURI, coordinator);
  await g.waitForDeployment();
  console.log("GashaponV2 deployed:", g.target);
}

main().catch((e) => { console.error(e); process.exit(1); });
