const hre = require("hardhat");

async function main() {
  const payment = process.env.BNBALL_TOKEN || "0x84B96083bF2d017bB93743429Ea936FEf665FA0b";
  const price = process.env.MINT_PRICE || "1000000000000";
  const baseURI = process.env.BASE_URI || "";
  const coordinator = process.env.VRF_COORDINATOR || "0xDA3b641D438362C440Ac5458c57e00a712b66700"; // BSC testnet

  const Gashapon = await hre.ethers.getContractFactory("Gashapon");
  const g = await Gashapon.deploy(payment, price, baseURI, coordinator);
  await g.waitForDeployment();
  console.log("Gashapon deployed:", g.target);
  console.log("After adding this address as a consumer in Chainlink VRF subscription UI, run a config script to call setVRFConfig().");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
