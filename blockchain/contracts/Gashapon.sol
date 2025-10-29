// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract Gashapon is ERC721, ReentrancyGuard, VRFConsumerBaseV2Plus {
    IERC20 public immutable paymentToken;

    uint256 public price;
    uint256 public totalSupply;
    uint256 public constant COMMON_VARIANTS = 20;
    uint256 public constant LEGENDARY_OFFSET = 20;
    uint256 public constant MAX_COMMON_SUPPLY = 100_000;
    uint256 public commonMinted;
    uint256 public jackpotMintPercent = 60; // percentage of commons that must be minted before jackpot allowed

    mapping(uint256 => uint256) private _variantOf;
    string private _baseTokenURI;

    // VRF v2.5 (Plus) settings
    IVRFCoordinatorV2Plus public COORDINATOR;
    bytes32 public keyHash; // gas lane
    uint256 public subscriptionId; // v2.5 uses a larger id format
    uint32 public callbackGasLimit = 250000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;

    // Track pending assignment per VRF request
    mapping(uint256 => uint256[]) private _pendingByRequest;

    constructor(address paymentToken_, uint256 price_, string memory baseURI_, address coordinator_)
        ERC721("Gashapon", "GASH")
        VRFConsumerBaseV2Plus(coordinator_)
    {
        paymentToken = IERC20(paymentToken_);
        price = price_;
        _baseTokenURI = baseURI_;
        COORDINATOR = IVRFCoordinatorV2Plus(coordinator_);
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        price = newPrice;
    }

    function setBaseURI(string calldata newBase) external onlyOwner {
        _baseTokenURI = newBase;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function count() external view returns (uint256) {
        return totalSupply;
    }

    function getVariant(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "!exists");
        return _variantOf[tokenId];
    }

    function mint(address receiver, uint256 quantity, bytes calldata) external nonReentrant {
        require(quantity > 0, "qty");
        require(commonMinted + quantity <= MAX_COMMON_SUPPLY, "cap");
        uint256 cost = price * quantity;
        require(paymentToken.transferFrom(msg.sender, address(this), cost), "pay");
        bool useVRF = address(COORDINATOR) != address(0) && subscriptionId != 0 && keyHash != bytes32(0);
        if (useVRF) {
            uint256[] memory mintedIds = new uint256[](quantity);
            for (uint256 i = 0; i < quantity; i++) {
                uint256 tokenId = ++totalSupply;
                _safeMint(receiver, tokenId);
                _variantOf[tokenId] = 0; // pending until VRF fulfillment
                mintedIds[i] = tokenId;
            }
            uint256 reqId = _requestRandomWord();
            _pendingByRequest[reqId] = mintedIds;
        } else {
            // local/dev fallback: assign variants deterministically without VRF
            for (uint256 i = 0; i < quantity; i++) {
                uint256 tokenId = ++totalSupply;
                _safeMint(receiver, tokenId);
                uint256 v = _deriveVariant(uint256(blockhash(block.number - 1)), tokenId);
                _variantOf[tokenId] = v;
            }
        }
        commonMinted += quantity;
    }

    // fulfill randomness and assign variants 1..20 using derived randomness per tokenId
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 base = randomWords[0];
        uint256[] memory ids = _pendingByRequest[requestId];
        require(ids.length > 0, "no-ids");
        delete _pendingByRequest[requestId];
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 tokenId = ids[i];
            if (_variantOf[tokenId] == 0) {
                uint256 v = _deriveVariant(base, tokenId);
                _variantOf[tokenId] = v;
            }
        }
    }

    function _requestRandomWord() internal returns (uint256 requestId) {
        require(address(COORDINATOR) != address(0) && subscriptionId != 0 && keyHash != bytes32(0), "vrf");
        VRFV2PlusClient.RandomWordsRequest memory req = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: subscriptionId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: numWords,
            extraArgs: VRFV2PlusClient._argsToBytes(
                VRFV2PlusClient.ExtraArgsV1({ nativePayment: false })
            )
        });
        return COORDINATOR.requestRandomWords(req);
    }

    function _deriveVariant(uint256 baseRand, uint256 tokenId) internal pure returns (uint256) {
        uint256 r = uint256(keccak256(abi.encodePacked(baseRand, tokenId))) % COMMON_VARIANTS;
        return r + 1; // 1..20
    }

    function burnCollection1(uint256[100] calldata tokens, address rewardsReceiver, bytes calldata) external nonReentrant {
        _validateAndBurn(tokens, false);
        uint256 tokenId = ++totalSupply;
        _safeMint(rewardsReceiver, tokenId);
        _variantOf[tokenId] = LEGENDARY_OFFSET + _legendaryVariantFrom(tokens);
    }

    function burnCollection2(uint256[20] calldata tokens, uint256, address rewardsReceiver) external nonReentrant {
        // enforce jackpot gating by minted percentage
        require(commonMinted * 100 / MAX_COMMON_SUPPLY >= jackpotMintPercent, "gate");
        _validateAndBurn(tokens, true);
        uint256 tokenId = ++totalSupply;
        _safeMint(rewardsReceiver, tokenId);
        _variantOf[tokenId] = LEGENDARY_OFFSET + COMMON_VARIANTS + 1;
    }

    function _validateAndBurn(uint256[100] calldata tokens, bool expectLegendary) internal {
        bool el = expectLegendary;
        el;
        uint256[20] memory counts;
        for (uint256 i = 0; i < 100; i++) {
            address o = ownerOf(tokens[i]);
            require(o == msg.sender, "owner");
            uint256 v = _variantOf[tokens[i]];
            require(v >= 1 && v <= COMMON_VARIANTS, "common");
            counts[v - 1]++;
        }
        for (uint256 v = 0; v < COMMON_VARIANTS; v++) {
            require(counts[v] >= 5, "need5");
        }
        for (uint256 i = 0; i < 100; i++) {
            _burn(tokens[i]);
        }
    }

    function _validateAndBurn(uint256[20] calldata tokens, bool expectLegendary) internal {
        bool el = expectLegendary;
        el;
        uint256[20] memory counts;
        for (uint256 i = 0; i < 20; i++) {
            address o = ownerOf(tokens[i]);
            require(o == msg.sender, "owner");
            uint256 v = _variantOf[tokens[i]];
            require(v > LEGENDARY_OFFSET && v <= LEGENDARY_OFFSET + COMMON_VARIANTS, "legendary");
            counts[v - LEGENDARY_OFFSET - 1]++;
        }
        for (uint256 v = 0; v < COMMON_VARIANTS; v++) {
            require(counts[v] >= 1, "need1");
        }
        for (uint256 i = 0; i < 20; i++) {
            _burn(tokens[i]);
        }
    }

    function _legendaryVariantFrom(uint256[100] calldata tokens) internal pure returns (uint256) {
        bytes32 h = keccak256(abi.encodePacked(tokens));
        return (uint256(h) % COMMON_VARIANTS) + 1; // 1..20, to be shifted by LEGENDARY_OFFSET by caller
    }

    function withdraw(address to) external onlyOwner {
        uint256 bal = paymentToken.balanceOf(address(this));
        require(paymentToken.transfer(to, bal), "x");
    }

    // Admin functions
    function setJackpotMintPercent(uint256 percent) external onlyOwner {
        require(percent <= 100, "pct");
        jackpotMintPercent = percent;
    }

    function setVRFConfigV25(address coordinator, bytes32 keyHash_, uint256 subId, uint32 cbGasLimit, uint16 confs) external onlyOwner {
        COORDINATOR = IVRFCoordinatorV2Plus(coordinator);
        keyHash = keyHash_;
        subscriptionId = subId;
        if (cbGasLimit != 0) callbackGasLimit = cbGasLimit;
        if (confs != 0) requestConfirmations = confs;
    }
}
