import "./styles.css";
import M from "materialize-css";
import { Button, Row, Card, Collapsible } from "react-materialize";
import React, { Component } from "react";
import MintComponent from "./MintComponent";
import { web3_eth, BatchRequest, NFTContract } from "./Common";

const queryPostfix =
  "/nft?chain=0x61&format=decimal&limit=100&token_addresses%5B0%5D=" +
  NFTContract +
  "&media_items=false";

let contractMethods = new web3_eth.Contract(
  [
    {
      inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
      name: "getVariant",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
      name: "tokenURI",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "uint256[100]",
          name: "tokens",
          type: "uint256[100]"
        },
        {
          internalType: "address",
          name: "rewardsReceiver",
          type: "address"
        },
        {
          internalType: "bytes",
          name: "data",
          type: "bytes"
        }
      ],
      name: "burnCollection1",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "uint256[20]",
          name: "tokens",
          type: "uint256[20]"
        },
        {
          internalType: "uint256",
          name: "minimumJackpot",
          type: "uint256"
        },
        {
          internalType: "address",
          name: "rewardsReceiver",
          type: "address"
        }
      ],
      name: "burnCollection2",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ],
  NFTContract
).methods;

const GetNFTVariant = contractMethods.getVariant;
const GetTokenURI = contractMethods.tokenURI;
const { burnCollection1, burnCollection2 } = contractMethods;
contractMethods = undefined;

const variantsCache = {};
const tokenUriCache = {};
const imageCache = {};

const simpleModal = {};

const htmlspecialchars = (function () {
  const mapObj = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  const re = new RegExp(Object.keys(mapObj).join("|"), "gi");

  return function (str) {
    return str.replace(re, function (matched) {
      return mapObj[matched.toLowerCase()];
    });
  };
})();
const safetoast = function (text) {
  M.toast({ html: htmlspecialchars(text) });
};
const fasttoast = function (text) {
  M.toast({ html: text });
};

const injected = window.ethereum;

const sendTransaction = injected
  ? function (data) {
      return injected.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: injected.selectedAddress,
            to: NFTContract,
            data: data,
            chainId: "0x61"
          }
        ]
      });
    }
  : undefined;

class ModalExample extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentHeader: "",
      currentBody: ""
    };
    this.NFTListLOCK = false;
  }

  componentDidMount() {
    simpleModal.show = this.showModal.bind(this);
    Object.freeze(this.simpleModal);
  }

  showModal(header, body) {
    this.setState(
      {
        currentHeader: htmlspecialchars(header),
        currentBody: htmlspecialchars(body)
      },
      () => {
        const elem = document.getElementById("theModal");
        const instance = M.Modal.init(elem);
        instance.open();
      }
    );
  }

  render() {
    const { currentHeader, currentBody } = this.state;
    return (
      <div className="modal" id="theModal">
        <div className="modal-content" style={{ color: "black" }}>
          <strong>{currentHeader}</strong>
          <p>{currentBody}</p>
        </div>
        <div className="modal-footer">
          <a
            href="#!"
            className="modal-close waves-effect waves-green btn-flat"
          >
            Close
          </a>
        </div>
      </div>
    );
  }
}
class NftCard extends Component {
  constructor(props) {
    super(props);
    this.nftid = props.nftid;
    this.variant = props.variant;
    this.state = { img: undefined };
  }

  async componentDidMount() {
    try {
      const id = this.nftid;
      let uri = tokenUriCache[id];
      if (!uri) {
        uri = await GetTokenURI(id).call();
        tokenUriCache[id] = uri;
      }
      if (uri && typeof uri === "string") {
        let http = uri.startsWith("ipfs://")
          ? "https://ipfs.io/ipfs/" + uri.slice(7)
          : uri;
        const cached = imageCache[http];
        if (cached) {
          this.setState({ img: cached });
          return;
        }
        const res = await fetch(http);
        const meta = await res.json();
        let img = meta?.image || meta?.image_url;
        if (img && typeof img === "string") {
          if (img.startsWith("ipfs://")) img = "https://ipfs.io/ipfs/" + img.slice(7);
          imageCache[http] = img;
          this.setState({ img });
        }
      }
    } catch (e) {
      // ignore, fallback to variant sprite
    }
  }

  render() {
    const { nftid, variant } = this;
    const { img } = this.state;
    return (
      <Card
        className="col s6 l3"
        title={"NFT #" + nftid}
        style={{ backgroundColor: "rgba(0, 0, 0, 0)" }}
      >
        <img
          crossOrigin="anonymous"
          alt=""
          src={img || ("nft-" + variant + ".png")}
          style={{ width: "100%" }}
          className="card-content"
        />
        <div className="card-action" style={{ width: "100%" }}></div>
        <Button style={{ width: "100%", display: "block" }}>trade</Button>
      </Card>
    );
  }
}

class NFTList extends Component {
  constructor(props) {
    super(props);
    this.addy = props.addy;
    this.state = {
      nftlist: null,
      claimLegendarySets: 1
    };
    this.minjackpot = props.minjackpot ?? "1";
    this.NFTListLOCK = false;
  }

  async refreshNFTListLoop() {
    const { addy } = this;
    if (!addy || this.NFTListLOCK) {
      return;
    }
    this.NFTListLOCK = true;
    try {
      const nftlist = [];
      let cursor = undefined;
      while (true) {
        const xhr = new XMLHttpRequest();
        const query1 =
          "https://deep-index.moralis.io/api/v2/" + addy + queryPostfix;
        xhr.open("GET", cursor ? query1 + "&cursor=" + cursor : query1, true);
        xhr.setRequestHeader("accept", "application/json");
        xhr.setRequestHeader(
          "X-API-Key",
          "pIPuzImDyQXnJmUAmA0MrBWw87WFwtv7GLVAy9mXnarIp8lSLDmwDpMmDfEOEhoJ"
        );
        const fatnftlist = JSON.parse(
          await new Promise(function (resolve, reject) {
            xhr.onload = function () {
              const { status, responseText } = xhr;
              if (status > 199 && status < 300) {
                resolve(responseText);
              } else {
                try {
                  const errortext = JSON.parse(responseText).message;
                  fasttoast(
                    "Unable to fetch NFT collection: " +
                      htmlspecialchars(errortext)
                  );
                  reject("Moralis API call failed: " + errortext);
                } catch (e) {
                  reject(e);
                }
              }
            };
            xhr.onerror = reject;
            xhr.send();
          })
        );
        for (const { token_id } of fatnftlist.result) {
          nftlist.push(token_id);
        }
        cursor = fatnftlist.cursor;

        if (!cursor) {
          break;
        }
      }
      await new Promise(function (completer, rejecter) {
        let ctr = 0;
        const batch = new BatchRequest();
        let target = 0;
        for (const nftid2 of nftlist) {
          if (variantsCache[nftid2] === undefined) {
            batch.add(
              GetNFTVariant(nftid2).call.request({}, function (error, result) {
                if (error) {
                  rejecter(error);
                } else {
                  const asint = parseInt(result, 10);
                  if (asint > 0) {
                    variantsCache[nftid2] = asint.toString();
                  }
                  if (target === ++ctr) {
                    completer();
                  }
                }
              })
            );
          }
        }
        target = batch.requests.length;
        if (target > 0) {
          batch.execute();
        } else {
          completer();
        }
      });
      this.setState({ nftlist: nftlist });
    } catch {
      // swallow; toast already shown upstream when possible
    } finally {
      this.NFTListLOCK = false;
    }
  }

  componentDidMount() {
    const thefun = this.refreshNFTListLoop.bind(this);
    this.interval = setInterval(thefun, 10000);
    thefun();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const { nftlist } = this.state;
    const { addy, minjackpot } = this;

    if (nftlist === null) {
      return (
        <div className="App" style={{ backgroundColor: "#FFAAC9" }}>
          <h1 style={{ color: "black", width: "100%" }}>
            Loading collection...
          </h1>
          <div className="progress">
            <div className="indeterminate"></div>
          </div>
        </div>
      );
    }

    const nftlist2 = {};
    for (const id of nftlist) {
      const variant = variantsCache[id];
      const nestedlist = nftlist2[variant];
      if (nestedlist) {
        nestedlist.push(id);
      } else {
        nftlist2[variant] = [id];
      }
    }
    const rngqueue = nftlist2["undefined"];
    delete nftlist2["undefined"];
    const entries = Object.entries(nftlist2);

    const legendaryList = [];
    const commonList = [];
    let commonCount = 0;
    let legendaryCount = 0;
    for (const relation of entries) {
      let list3;
      const len6 = relation[1].length;
      if (relation[0] > 20) {
        list3 = legendaryList;
        legendaryCount += len6;
      } else {
        list3 = commonList;
        commonCount += len6;
      }
      list3.push(relation);
    }
    // Build maps for faster lookups
    const commonMap = {};
    for (const [variantKey, ids] of commonList) {
      commonMap[variantKey] = ids;
    }
    const legendaryMap = {};
    for (const [variantKey, ids] of legendaryList) {
      legendaryMap[variantKey] = ids;
    }

    // Select exactly 5 of each common variant (1..20)
    let legendaryBurnList = [];
    for (let v = 1; v <= 20; v++) {
      const arr = commonMap[v];
      if (!arr || arr.length < 5) {
        legendaryBurnList = undefined;
        break;
      }
      for (let i = 0; i < 5; i++) legendaryBurnList.push(arr[i]);
    }
    // compute how many full legendary claim sets are available (5 of each common)
    let maxSets = Infinity;
    for (let v = 1; v <= 20; v++) {
      const arr = commonMap[v] || [];
      const sets = Math.floor(arr.length / 5);
      if (sets < maxSets) maxSets = sets;
    }
    if (maxSets === Infinity) maxSets = 0;

    // Select exactly 1 of each legendary variant (21..40)
    let jackpotBurnList = [];
    for (let v = 21; v <= 40; v++) {
      const arr = legendaryMap[v];
      if (!arr || arr.length < 1) {
        jackpotBurnList = undefined;
        break;
      }
      jackpotBurnList.push(arr[0]);
    }
    const jackpotBurnABI =
      jackpotBurnList && jackpotBurnList.length === 20
        ? burnCollection2(jackpotBurnList, minjackpot, addy).encodeABI()
        : undefined;
    jackpotBurnList = undefined;
    return (
      <div className="App row">
        <Row
          className="col s12"
          style={{
            margin: 0,
            display: "flex",
            alignItems: "flex-end",
            width: "100%",
            flexWrap: "wrap"
          }}
        >
          <Row className="col s12 m6" style={{ marginLeft: "-10px", paddingLeft: 0 }}>
            <div className="col s12" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "black" }}>Legendary sets:</span>
              <button className="btn" style={{ minWidth: 36, padding: "0 10px" }} onClick={() => this.setState({ claimLegendarySets: Math.max(1, this.state.claimLegendarySets - 1) })}>-</button>
              <input style={{ width: 60, textAlign: "center", color: "black", background: "#fff", borderRadius: 6 }} value={this.state.claimLegendarySets} readOnly />
              <button className="btn" style={{ minWidth: 36, padding: "0 10px" }} onClick={() => this.setState({ claimLegendarySets: this.state.claimLegendarySets + 1 })}>+</button>
              <button className="btn" style={{ marginLeft: 8, backgroundColor: "#ffce19", color: "black" }} onClick={() => this.setState({ claimLegendarySets: Math.max(1, maxSets) })}>Max</button>
            </div>
            <button
              className="btn waves-effect waves-light col s12 m6"
              disabled={maxSets < 1}
              onClick={async function () {
                try {
                  const setsToClaim = Math.min(this.state.claimLegendarySets, maxSets);
                  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
                  for (let k = 0; k < setsToClaim; k++) {
                    const list = [];
                    for (let v = 1; v <= 20; v++) {
                      const arr = commonMap[v];
                      for (let i = 0; i < 5; i++) list.push(arr[5 * k + i]);
                    }
                    const abi = burnCollection1(list, addy, "0x").encodeABI();
                    const txHash = await sendTransaction(abi);
                    for (let i = 0; i < 60; i++) {
                      const rcpt = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [txHash] });
                      if (rcpt && rcpt.status === "0x1") break;
                      await wait(1500);
                    }
                  }
                } catch (e) { console.log(e); }
              }.bind(this)}
              style={{ flex: "none" }}
            >
              claim legendary
            </button>
            <button
              className="btn waves-effect waves-light col s12 m6"
              disabled={!jackpotBurnABI}
              onClick={async function () {
                try {
                  await sendTransaction(jackpotBurnABI);
                } catch (e) {
                  console.log(e);
                }
              }}
              style={{ flex: "none" }}
            >
              claim jackpot
            </button>
          </Row>
          <img
            src="jackpot-dashboard.png"
            alt="jackpot = 50k"
            className="col s12 m6"
            style={{ flex: "none" }}
          ></img>
        </Row>

        <div style={{ backgroundColor: "#FFAAC9" }} className="col s12 row">
          <h1
            style={{
              color: "black",
              marginTop: "-0.5em",
              width: "100%"
            }}
          >
            MY COLLECTION
          </h1>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", margin: "8px 0", width: "100%" }}>
            <button
              className="btn"
              style={{ backgroundColor: "#ffce19", color: "black", borderRadius: 24 }}
              onClick={() => { this.NFTListLOCK = false; fasttoast("Refreshing..."); this.refreshNFTListLoop(); }}
            >
              Verify
            </button>
          </div>

          {commonList.length === 0 ? (
            <p className="flow-text" style={{ color: "black" }}>
              You don't have any common NFTs yet. You should try minting some!
            </p>
          ) : (
            <NFTCollapsible nftlist={commonList}></NFTCollapsible>
          )}

          {legendaryList.length === 0 ? (
            <p className="flow-text" style={{ color: "black" }}>
              You don't have any legendary NFTs yet. You can get one by burning
              a full collection of common NFTs (20 common variants x 5 NFTs per
              variant).
            </p>
          ) : (
            <NFTCollapsible
              nftlist={legendaryList}
              isLegendary={true}
            ></NFTCollapsible>
          )}

          {rngqueue && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0" }}>
                <h5 style={{ margin: 0, color: "black" }}>Verify your collection</h5>
                <button
                  className="btn"
                  style={{ backgroundColor: "#ffce19", color: "black", borderRadius: 24 }}
                  onClick={() => { this.NFTListLOCK = false; fasttoast("Refreshing..."); this.refreshNFTListLoop(); }}
                >
                  Verify
                </button>
              </div>
              <Collapsible className="col s12">
                <li>
                  <h1
                    className="flow-text collapsible-header"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, #9B9B9B, white, #9B9B9B)",
                      borderRadius: "999px 999px 999px 999px",
                      width: "100%",
                      borderBottom: "5px solid black",
                      borderLeft: "5px solid black",
                      color: "black"
                    }}
                  >
                    {rngqueue.length.toString() +
                      " NFTs pending variant assignment"}
                  </h1>
                  <div className="collapsible-body" style={{ border: 0 }}>
                    <NFTSet variant="0" nftlist={rngqueue} />
                  </div>
                </li>
              </Collapsible>
              <p style={{ color: "black" }}>
                The Gashapon NFT contract employs a hierarchical derivation
                CSRNG technique that minimizes the frequency of calls made to
                ChainLink VRF. This results in substantial savings on gas fees
                and LINK, while ensuring the highest level of casino-grade
                resistance to manipulation and randomness. However, one
                limitation of this method is that new NFTs will not be allocated
                a variant until the shiftRng() function is next executed.
              </p>
              <Collapsible className="col s12">
                <li>
                  <h1
                    className="flow-text collapsible-header"
                    style={{
                      backgroundColor: "#ffce19",
                      borderRadius: "999px",
                      borderBottom: "5px solid black",
                      borderLeft: "5px solid black",
                      width: "100%",
                      color: "black"
                    }}
                  >
                    Rarity summary (your holdings)
                  </h1>
                  <div className="collapsible-body" style={{ border: 0 }}>
                    <div style={{ color: "black" }}>
                      <strong>Commons (1–20):</strong>
                      <div>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map((v) => {
                          const c = (nftlist2[v]?.length ?? 0);
                          return (
                            <span style={{ marginRight: "0.9em" }}>V{v}: {c}/5</span>
                          );
                        })}
                      </div>
                      <strong>Legendaries (21–40):</strong>
                      <div>
                        {Array.from({ length: 20 }, (_, i) => i + 21).map((v) => {
                          const c = (nftlist2[v]?.length ?? 0);
                          return (
                            <span style={{ marginRight: "0.9em" }}>V{v}: {c}/1</span>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 8 }}>Hidden (pending): {rngqueue.length}</div>
                    </div>
                  </div>
                </li>
              </Collapsible>
            </div>
          )}
        </div>
      </div>
    );
  }
}
class NFTCollapsible extends Component {
  constructor(props) {
    super(props);
    this.nftlist = props.nftlist;
    this.isLegendary = props.isLegendary;
  }

  render() {
    const { nftlist, isLegendary } = this;

    const ending = isLegendary ? "/1 NFTs collected" : "/5 NFTs collected";

    const prefix = isLegendary ? "Legendary set #" : "Set #";

    return (
      <Collapsible className="col s12">
        {nftlist.map(([key, val1]) => (
          <li>
            <h1
              className="flow-text collapsible-header"
              style={
                isLegendary
                  ? {
                      backgroundImage:
                        "linear-gradient(90deg, #FEBA0A, #FFF469, #FEBA0A)",
                      borderRadius: "999px 999px 999px 999px",
                      borderBottom: "5px solid black",
                      borderLeft: "5px solid black",
                      width: "100%"
                    }
                  : {
                      backgroundColor: "#ff7bac",
                      borderRadius: "999px 999px 999px 999px",
                      borderBottom: "5px solid black",
                      borderLeft: "5px solid black",
                      width: "100%"
                    }
              }
            >
              {prefix +
                (isLegendary ? (key - 20).toString() : key) +
                ": " +
                val1.length.toString() +
                ending}
            </h1>
            <div className="collapsible-body" style={{ border: 0 }}>
              <NFTSet nftlist={val1} variant={key}></NFTSet>
            </div>
          </li>
        ))}
      </Collapsible>
    );
  }
}
class NFTSet extends Component {
  constructor(props) {
    super(props);
    this.nftlist = props.nftlist;
    this.variant = props.variant;
  }

  render() {
    const { nftlist, variant } = this;
    return (
      <Row className="col s12">
        {nftlist.map((id) => (
          <NftCard
            key={id}
            nftid={id}
            title={"NFT #" + id.toString()}
            variant={variant}
          />
        ))}
      </Row>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      addy: undefined,
      eth: undefined,
      providers: [],
      chosenIndex: 0,
      modalOpen: false,
      isMintPage: true
    };
  }

  async connectWallet() {
    let LOCK = false;
    const { eth } = this.state;

    if (!eth) {
      this.openModal(
        "No wallet found",
        "No wallets are detected, please install MetaMask"
      );
      return;
    }

    if (LOCK) {
      return;
    }

    LOCK = true;

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x61" }]
      });

      const temp = await eth.request({ method: "eth_requestAccounts" });
      this.setState({ addy: temp[0] });
    } catch (err) {
      this.openModal("Wallet connection error", "Unable to connect wallet!");
      return;
    } finally {
      LOCK = false;
    }
    this.openModal(
      "Wallet connected!",
      "Congratulations! Your wallet has been successfully connected to the dapp. You can now start using the features and functionalities available to you. Enjoy!"
    );
  }

  openModal(header, body) {
    this.setState({ modalOpen: true });
    simpleModal.show(header, body);
  }

  componentDidMount() {
    // Detect injected providers (MetaMask, Coinbase, etc.) and auto-pick (prefer MetaMask)
    const provs = [];
    if (injected?.providers?.length) {
      for (const p of injected.providers) provs.push(p);
    } else if (injected) {
      provs.push(injected);
    }
    let pick = provs.find((p) => p.isMetaMask) || provs[0];
    this.setState({ providers: provs, eth: pick });
    if (pick) {
      pick.on("accountsChanged", (accounts) => {
        this.setState({ addy: accounts?.[0] });
      });
      const addy2 = pick.selectedAddress;
      if (addy2) this.setState({ addy: addy2 });
    }
  }

  componentWillUnmount() {
    const { eth } = this.state;
    if (eth) eth.removeAllListeners("accountsChanged");
  }

  render() {
    const { addy, modalOpen, isMintPage, providers, chosenIndex } = this.state;
    const shorten = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");
    const setState2 = this.setState.bind(this);
    return (
      <div style={{ minHeight: "100vh" }}>
        <ModalExample style={{ zIndex: 3 }} isOpen={modalOpen} />

        <div className="container2">
          <div>
            <br />
          </div>
          <Row>
            <img
              src="gashaponlogo-1.png"
              alt="Gashapon logo"
              className="col s12 l4"
            />
            {addy ? (
              <div className="col s6 l3 right" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                <span style={{ color: "black" }}>{shorten(addy)}</span>
                <img
                  src="exit.png"
                  alt="disconnect"
                  style={{ width: 28, height: 28, cursor: "pointer" }}
                  onClick={() => {
                    const { eth } = this.state;
                    if (eth) eth.removeAllListeners("accountsChanged");
                    this.setState({ addy: undefined });
                  }}
                />
              </div>
            ) : (
              <div className="col s12 l6 right" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button onClick={this.connectWallet.bind(this)} waves="light" elem="button">
                  Connect Wallet
                </Button>
              </div>
            )}
            {addy && (
              <Button
                waves="light"
                elem="button"
                className="col s6 l3 right"
                styles={{ display: "inline-block" }}
                onClick={function () {
                  setState2({ isMintPage: !isMintPage });
                }}
              >
                {isMintPage ? "dashboard" : "mint"}
              </Button>
            )}
          </Row>
          {isMintPage ? (
            <MintComponent
              notconnected={!addy}
              addy={addy}
              openModal={this.openModal.bind(this)}
            ></MintComponent>
          ) : addy ? (
            <NFTList addy={addy}></NFTList>
          ) : (
            <div className="App blue-grey darken-3"></div>
          )}
        </div>
      </div>
    );
  }
}

export default App;
