// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Withdrawal {
    function transfer(address to, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract TokenWithdrawal {
    error NotOwner();
    error InvalidAddress();
    error InvalidAmount();
    error ContractPaused();
    error TokenNotAllowed();
    error TimeExpired();
    error OrderClaimed();
    error InvalidSignature();
    error ERC20TransferFailed();

    bytes32 public constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(uint256 orderId,address user,address token,uint256 amount,uint256 serviceAmount,uint256 deadline)");
    bytes32 public constant DOMAIN_NAME = keccak256("TokenWithdrawal");
    bytes32 public constant DOMAIN_VERSION = keccak256("1");

    address public owner;
    address public verifyAddress;
    address public feeReceiver;
    bool public paused;
    bytes32 public immutable DOMAIN_SEPARATOR;
    uint256 public immutable DOMAIN_CHAIN_ID;

    mapping(address => bool) public allowToken;
    mapping(uint256 => ClaimInfo) public claimList;

    struct ClaimInfo {
        address claimer;
        address token;
        uint256 claimAmount;
        uint256 serviceAmount;
        uint256 claimTime;
    }

    event Claimed(
        address indexed token,
        uint256 indexed orderId,
        address indexed user,
        uint256 claimAmount,
        uint256 serviceAmount,
        address feeReceiver,
        uint256 claimTime
    );
    event FeeReceiverUpdated(address indexed feeReceiver);
    event TokenAllowedUpdated(address indexed token, bool allowed);
    event VerifyAddressUpdated(address indexed verifyAddress);
    event PausedUpdated(bool paused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Swept(address indexed token, address indexed to, uint256 amount);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address treasury_, address[] memory allowTokens_) {
        if (treasury_ == address(0)) revert InvalidAddress();

        owner = msg.sender;
        verifyAddress = msg.sender;
        feeReceiver = treasury_;

        uint256 currentChainId = block.chainid;
        DOMAIN_CHAIN_ID = currentChainId;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                DOMAIN_NAME,
                DOMAIN_VERSION,
                currentChainId,
                address(this)
            )
        );

        emit OwnershipTransferred(address(0), msg.sender);
        emit VerifyAddressUpdated(msg.sender);
        emit FeeReceiverUpdated(treasury_);

        for (uint256 i = 0; i < allowTokens_.length; i++) {
            _setTokenAllowed(allowTokens_[i], true);
        }

        emit PausedUpdated(false);
    }

    function claim(
        address token,
        uint256 orderId,
        uint256 amount,
        uint256 serviceAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        if (paused) revert ContractPaused();
        if (!allowToken[token]) revert TokenNotAllowed();
        if (amount == 0) revert InvalidAmount();
        if (deadline < block.timestamp) revert TimeExpired();
        if (claimList[orderId].claimer != address(0)) revert OrderClaimed();

        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                orderId,
                msg.sender,
                token,
                amount,
                serviceAmount,
                deadline
            )
        );

        if (_recoverSigner(structHash, v, r, s) != verifyAddress) {
            revert InvalidSignature();
        }

        claimList[orderId] = ClaimInfo({
            claimer: msg.sender,
            token: token,
            claimAmount: amount,
            serviceAmount: serviceAmount,
            claimTime: block.timestamp
        });

        _safeTransfer(token, msg.sender, amount);
        if (serviceAmount > 0) {
            _safeTransfer(token, feeReceiver, serviceAmount);
        }

        emit Claimed(token, orderId, msg.sender, amount, serviceAmount, feeReceiver, block.timestamp);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedUpdated(paused_);
    }

    function stop() external onlyOwner {
        paused = true;
        emit PausedUpdated(true);
    }

    function start() external onlyOwner {
        paused = false;
        emit PausedUpdated(false);
    }

    function setTokenAddress(address token, bool allowed) external onlyOwner {
        _setTokenAllowed(token, allowed);
    }

    function setVerifyAddress(address verifyAddress_) external onlyOwner {
        if (verifyAddress_ == address(0)) revert InvalidAddress();
        verifyAddress = verifyAddress_;
        emit VerifyAddressUpdated(verifyAddress_);
    }

    function setFeeReceiver(address feeReceiver_) external onlyOwner {
        if (feeReceiver_ == address(0)) revert InvalidAddress();
        feeReceiver = feeReceiver_;
        emit FeeReceiverUpdated(feeReceiver_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function sweep(address token, address to) external onlyOwner {
        if (token == address(0) || to == address(0)) revert InvalidAddress();

        uint256 amount = IERC20Withdrawal(token).balanceOf(address(this));
        if (amount == 0) revert InvalidAmount();

        _safeTransfer(token, to, amount);
        emit Swept(token, to, amount);
    }

    function sweep(address token) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();

        uint256 amount = IERC20Withdrawal(token).balanceOf(address(this));
        if (amount == 0) revert InvalidAmount();

        _safeTransfer(token, msg.sender, amount);
        emit Swept(token, msg.sender, amount);
    }

    function getClaimDigest(
        uint256 orderId,
        address user,
        address token,
        uint256 amount,
        uint256 serviceAmount,
        uint256 deadline
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                orderId,
                user,
                token,
                amount,
                serviceAmount,
                deadline
            )
        );

        return _hashTypedData(structHash);
    }

    function _recoverSigner(bytes32 structHash, uint8 v, bytes32 r, bytes32 s) private view returns (address) {
        address signer = ecrecover(_hashTypedData(structHash), v, r, s);
        if (signer == address(0)) revert InvalidSignature();
        return signer;
    }

    function _hashTypedData(bytes32 structHash) private view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        bool success = IERC20Withdrawal(token).transfer(to, amount);
        if (!success) revert ERC20TransferFailed();
    }

    function _setTokenAllowed(address token, bool allowed) private {
        if (token == address(0)) revert InvalidAddress();
        allowToken[token] = allowed;
        emit TokenAllowedUpdated(token, allowed);
    }
}
