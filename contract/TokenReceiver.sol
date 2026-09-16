// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20TokenReceiver {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract TokenReceiver {
    error NotOwner();
    error InvalidAddress();
    error InvalidAmount();
    error TokenNotAllowed();
    error TransferFailed();

    event PaymentReceived(
        address indexed payer,
        address indexed token,
        address indexed treasury,
        uint256 amount,
        uint256 orderId,
        uint256 timestamp
    );
    event TreasuryUpdated(address indexed treasury);
    event TokenAllowedUpdated(address indexed token, bool allowed);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    address public owner;
    address public treasury;
    uint256 public nextOrderId;

    mapping(address => bool) public allowToken;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address treasury_, address[] memory allowTokens_) {
        if (treasury_ == address(0)) revert InvalidAddress();

        owner = msg.sender;
        treasury = treasury_;
        nextOrderId = 100000;

        emit OwnershipTransferred(address(0), msg.sender);
        emit TreasuryUpdated(treasury_);

        for (uint256 i = 0; i < allowTokens_.length; i++) {
            _setTokenAllowed(allowTokens_[i], true);
        }
    }

    function pay(address token, uint256 amount) external {
        if (!allowToken[token]) revert TokenNotAllowed();
        if (amount == 0) revert InvalidAmount();

        uint256 orderId = nextOrderId;
        nextOrderId = orderId + 1;

        _safeTransferFrom(token, msg.sender, treasury, amount);

        emit PaymentReceived(msg.sender, token, treasury, amount, orderId, block.timestamp);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert InvalidAddress();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setTokenAddress(address token, bool allowed) external onlyOwner {
        _setTokenAllowed(token, allowed);
    }

    function setTokenAddressBatch(address[] calldata tokens, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            _setTokenAllowed(tokens[i], allowed);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function _setTokenAllowed(address token, bool allowed) private {
        if (token == address(0)) revert InvalidAddress();
        allowToken[token] = allowed;
        emit TokenAllowedUpdated(token, allowed);
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool success, bytes memory returndata) =
            token.call(abi.encodeCall(IERC20TokenReceiver.transferFrom, (from, to, amount)));

        if (!success) revert TransferFailed();
        if (returndata.length > 0 && !abi.decode(returndata, (bool))) {
            revert TransferFailed();
        }
    }
}
