const hre = require("hardhat");

// Usage (PowerShell):
// $env:NFT_ADDRESS="<DEPLOYED_ADDRESS>"; $env:USER_ADDRESS="<WALLET_ADDRESS>"; 
// npx hardhat run scripts/check-user-state.js --network bsctest

const ERC20_ABI = [
  { "constant": true, "inputs": [], "name": "decimals", "outputs": [{"name":"","type":"uint8"}], "type": "function" },
  { "constant": true, "inputs": [{"name":"","type":"address"}], "name": "balanceOf", "outputs": [{"name":"","type":"uint256"}], "type": "function" },
  { "constant": true, "inputs": [{"name":"","type":"address"},{"name":"","type":"address"}], "name": "allowance", "outputs": [{"name":"","type":"uint256"}], "type": "function" }
];

async function main() {
  const addr = process.env.NFT_ADDRESS;
  const user = process.env.USER_ADDRESS;
  if (!addr || !user) throw new Error("Missing NFT_ADDRESS or USER_ADDRESS env var");

  const g = await hre.ethers.getContractAt("Gashapon", addr);
  const price = await g.price();
  const payment = await g.paymentToken();
  const pt = new hre.ethers.Contract(payment, ERC20_ABI, hre.ethers.provider);
  const [dec, bal, allow, count] = await Promise.all([
    pt.decimals(),
    pt.balanceOf(user),
    pt.allowance(user, addr),
    g.count()
  ]);

  const out = {
    nft: String(addr),
    user: String(user),
    paymentToken: String(payment),
    price: price ? price.toString() : "0",
    decimals: typeof dec === "bigint" ? dec.toString() : String(dec),
    userBalance: bal ? bal.toString() : "0",
    allowance: allow ? allow.toString() : "0",
    totalSupply: count ? count.toString() : "0"
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
