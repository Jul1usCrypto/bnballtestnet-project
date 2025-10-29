const hre = require("hardhat");

async function main() {
  const [deployer, user] = await hre.ethers.getSigners();

  // 1) Deploy mock ERC20 as payment token
  const MockToken = await hre.ethers.getContractFactory("MockToken");
  const token = await MockToken.deploy("BNBALL Mock", "BNBALL");
  await token.waitForDeployment();
  console.log("MockToken:", token.target);

  // Mint user some tokens for testing (1,000,000 BNBALL with 18 decimals)
  const mintTx = await token.mint(user.address, hre.ethers.parseUnits("1000000", 18));
  await mintTx.wait();
  console.log("Minted BNBALL to:", user.address);

  // 2) Deploy Gashapon with no VRF (local fallback RNG will be used)
  const price = hre.ethers.parseUnits("0.000001", 18); // 1e-6 token per mint
  const baseURI = "";
  // Use a non-zero coordinator (BSC testnet) to satisfy VRF base constructor; not used locally
  const coordinator = "0xDA3b641D438362C440Ac5458c57e00a712b66700";

  const Gashapon = await hre.ethers.getContractFactory("Gashapon");
  const g = await Gashapon.deploy(token.target, price, baseURI, coordinator);
  await g.waitForDeployment();
  console.log("Gashapon:", g.target);

  console.log("\nLocal test ready:");
  console.log("PaymentTokenContract:", token.target);
  console.log("NFTContract:", g.target);
  console.log("Test user:", user.address);
  console.log("Next: approve + mint using a script or via frontend retarget to localhost.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
