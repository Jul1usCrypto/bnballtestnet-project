import Web3 from "web3";

export const NFTContract = "0x090fd4716C4E3DEcA78CEE5d23EBf343F22500b2";
export const PaymentTokenContract =
  "0x84B96083bF2d017bB93743429Ea936FEf665FA0b";
let tmpweb3 = new Web3(
  "https://data-seed-prebsc-1-s1.binance.org:8545"
);
export const web3_eth = tmpweb3.eth;
export const BatchRequest = tmpweb3.BatchRequest;
export const { fromWei } = tmpweb3.utils;

tmpweb3 = undefined;
