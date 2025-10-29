import React, { Component } from "react";
import { Button, Row, Col, Collapsible } from "react-materialize";
import Web3 from "web3";
import "./styles.css";
import { web3_eth, NFTContract, PaymentTokenContract, fromWei } from "./Common";

const toBigNumber = Web3.utils.toBN;
const minimumApprove = toBigNumber("340282366920938463463374607431768211456");

const eth = window.ethereum;

let ERC20Methods = new web3_eth.Contract(
  [
    {
      inputs: [
        { internalType: "address", name: "owner", type: "address" },
        { internalType: "address", name: "spender", type: "address" }
      ],
      name: "allowance",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ],
  PaymentTokenContract
).methods;
const ERC20Approve =
  "0x095ea7b3000000000000000000000000" +
  NFTContract.slice(2).toLowerCase() +
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const ERC20Allowance = ERC20Methods.allowance;
ERC20Methods = undefined;
let contractMethods = new web3_eth.Contract(
  [
    {
      inputs: [
        { internalType: "address", name: "receiver", type: "address" },
        { internalType: "uint256", name: "quantity", type: "uint256" },
        { internalType: "bytes", name: "data", type: "bytes" }
      ],
      name: "mint",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "count",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [],
      name: "price",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ],
  NFTContract
).methods;
const totalSupply = contractMethods.count().call;
const getPrice = contractMethods.price().call;
const mint = contractMethods.mint;
const sendTransaction = eth
  ? function (to, data) {
      return eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: eth.selectedAddress,
            to: to,
            data: data,
            chainId: "0x61"
          }
        ]
      });
    }
  : undefined;
contractMethods = undefined;

class MintComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      quantity: 1,
      mintCount: 0,
      priceWei: "0"
    };
    this.openModal = props.openModal;
    this.notconnected = props.notconnected;
  }

  handleDecrementClick = () => {
    const { quantity } = this.state;
    if (quantity > 1) {
      this.setState({ quantity: quantity - 1 });
    }
  };

  handleIncrementClick = () => {
    const { quantity } = this.state;
    this.setState({ quantity: quantity + 1 });
  };

  handleX10Click = () => {
    const { quantity } = this.state;
    this.setState({ quantity: quantity + 10 });
  };

  handleX50Click = () => {
    const { quantity } = this.state;
    this.setState({ quantity: quantity + 50 });
  };

  handleX100Click = () => {
    const { quantity } = this.state;
    this.setState({ quantity: quantity + 100 });
  };

  render() {
    const { quantity, priceWei } = this.state;
    const totalWei = toBigNumber(priceWei).mul(toBigNumber(quantity));
    const totalToken = fromWei(totalWei, "ether");

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "nowrap"
        }}
      >
        <Row id="offsetbtn">
          <div className="col s12">
            <img
              src=""
              alt=""
              style={{ maxWidth: "3em", float: "right" }}
            />
          </div>
          <div className="col s12">
            <br />
          </div>
          <div className="col s12">
            <img
              src=""
              alt=""
              style={{ maxWidth: "3em", float: "right" }}
            />
          </div>
          <div className="col s12">
            <br />
          </div>
          <div className="col s12">
            <img
              src="twitter.png"
              alt=""
              style={{ maxWidth: "3em", float: "right" }}
            />
          </div>
        </Row>
        <Row id="rules" style={{ position: "absolute", zIndex: 10, left: 0, width: "100%" }}>
          <Row className="col s9 m6 l4">
            <Collapsible
              className="col s12"
              style={{ backgroundColor: "#ffce19" }}
            >
              <li
                className="col s12"
                style={{
                  backgroundColor: "#ffce19"
                }}
              >
                <img
                  className="collapsible-body"
                  style={{
                    backgroundColor: "#ffce19",
                    width: "100%"
                  }}
                  src="gashapon-rules.png"
                  alt="rules"
                />
                <div
                  className="collapsible-header"
                  style={{
                    backgroundColor: "#ffce19"
                  }}
                >
                  <strong className="flow-text">rules</strong>
                </div>
              </li>
            </Collapsible>
          </Row>
        </Row>

        <Row style={{ position: "absolute", zIndex: 8, bottom: "25%" }} id="machinescontainer">
          <img
            className="col s6 offset-s3"
            src="gashaponautomaaten.png"
            alt="Gashapon machines"
            id="largebg"
          />
          <img
            className="col s10 offset-s1 m6 offset-m3"
            src="mobilemachines.png"
            alt="Gashapon machines"
            id="smallbg"
          />
        </Row>
        <div
          style={{
            width: "100vw",
            backgroundImage: "linear-gradient(#616060, black)",
            position: "absolute",
            bottom: "0px",
            marginTop: "-5em"
          }}
        >
          <div className="container2 row">
            <div className="col s12 l6 offset-s0 offset-l3">
              <Row>
                <div>
                  <br />
                  <br />
                </div>
                <div className="col s2" style={{ fontSize: "3em", userSelect: "none", color: "#ffce19", textAlign: "right" }} onClick={this.handleDecrementClick}>-</div>
                <input
                  style={{
                    display: "block",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: "white"
                  }}
                  type="text"
                  value={quantity}
                  readOnly
                  className="col s8"
                />
                <div className="col s2" onClick={this.handleIncrementClick} style={{ fontSize: "3em", userSelect: "none", color: "#ffce19" }}>+</div>
              </Row>
              <div style={{ width: "100%", textAlign: "center", color: "#9B9B9B", marginTop: 6 }}>
                {totalToken} $BNBALL
              </div>
              <div>
                <br />
              </div>
              <Row>
                <center className="col s4">
                  <Button
                    className="darkpinkborder"
                    small
                    style={{ width: "90%", display: "block", backgroundColor: "#ffce19", color: "black" }}
                    onClick={this.handleX10Click}
                  >
                    X10
                  </Button>
                </center>
                <center className="col s4">
                  <Button
                    className="darkpinkborder"
                    small
                    style={{ width: "90%", left: "50%", display: "block", backgroundColor: "#ffce19", color: "black" }}
                    onClick={async function () {
                      const addy = this.props.addy;
                      try {
                        if (
                          minimumApprove.gt(
                            toBigNumber(
                              await ERC20Allowance(addy, NFTContract).call()
                            )
                          )
                        ) {
                          const txh = await eth.request({
                            method: "eth_sendTransaction",
                            params: [
                              {
                                from: addy,
                                to: PaymentTokenContract,
                                data: ERC20Approve,
                                chainId: "0x61"
                              }
                            ]
                          });
                          // wait for approval to be mined and allowance to reflect
                          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
                          let mined = false;
                          for (let i = 0; i < 40; i++) {
                            const rcpt = await eth.request({
                              method: "eth_getTransactionReceipt",
                              params: [txh]
                            });
                            if (rcpt && rcpt.status === "0x1") {
                              mined = true;
                              break;
                            }
                            await wait(1500);
                          }
                          // extra: poll allowance until it updates
                          if (mined) {
                            for (let i = 0; i < 20; i++) {
                              const cur = toBigNumber(
                                await ERC20Allowance(addy, NFTContract).call()
                              );
                              if (cur.gte(minimumApprove)) break;
                              await wait(1000);
                            }
                          }
                        }
                        // Whale-friendly batching: find the largest batch that passes estimateGas and submit sequentially
                        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
                        async function estimateBatch(n) {
                          try {
                            const data = mint(addy, n.toString(), "0x").encodeABI();
                            await web3_eth.estimateGas({ from: addy, to: NFTContract, data });
                            return true;
                          } catch (_) {
                            return false;
                          }
                        }
                        async function findMaxBatch(limit) {
                          // try full first
                          if (await estimateBatch(limit)) return limit;
                          // exponential backoff
                          let hi = limit;
                          let lo = 1;
                          while (lo < hi) {
                            const mid = Math.max(1, Math.floor((lo + hi + 1) / 2));
                            if (await estimateBatch(mid)) lo = mid; else hi = mid - 1;
                          }
                          return lo;
                        }
                        let remaining = this.state.quantity;
                        while (remaining > 0) {
                          const thisBatch = await findMaxBatch(remaining);
                          const txHash = await eth.request({
                            method: "eth_sendTransaction",
                            params: [
                              {
                                from: addy,
                                to: NFTContract,
                                data: mint(addy, thisBatch.toString(), "0x").encodeABI(),
                                chainId: "0x61"
                              }
                            ]
                          });
                          for (let i = 0; i < 60; i++) {
                            const rcpt = await eth.request({ method: "eth_getTransactionReceipt", params: [txHash] });
                            if (rcpt && rcpt.status === "0x1") break;
                            await wait(1500);
                          }
                          remaining -= thisBatch;
                        }
                      } catch (e) {
                        this.openModal(
                          "Unable to mint NFT",
                          e?.message ??
                            "An unknown error occoured while minting NFT"
                        );
                        return;
                      }
                      this.openModal(
                        "NFT minted successfully",
                        "Congratulations! Your NFT has been successfully minted and added to your collection."
                      );
                    }.bind(this)}
                    disabled={!this.props.addy}
                  >
                    Mint
                  </Button>
                </center>
                <Col s={4}>
                  <Button
                    className="darkpinkborder"
                    small
                    onClick={this.handleX100Click}
                    style={{ width: "90%", left: "50%", display: "block", backgroundColor: "#ffce19", color: "black" }}
                  >
                    X100
                  </Button>
                </Col>
              </Row>
            </div>
          </div>
        </div>
      </div>
    );
  }
  async updateTotalSupply() {
    if (this.totalSupplyLock) {
      return;
    }
    this.totalSupplyLock = true;
    try {
      this.setState({ mintCount: parseInt(await totalSupply()) });
    } finally {
      this.totalSupplyLock = false;
    }
  }
}

export default MintComponent;
