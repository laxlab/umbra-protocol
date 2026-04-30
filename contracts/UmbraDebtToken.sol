// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    Nox,
    euint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";

contract UmbraDebtToken is ERC7984, Ownable {

    address public vault;
    bool    public vaultSet;
    mapping(address => bool) private _hasDebt;

    event VaultSet(address indexed vault);
    event DebtMinted(address indexed user);
    event DebtBurned(address indexed user);

    error OnlyVault();
    error VaultAlreadySet();
    error ZeroAddress();

    constructor()
        ERC7984("Umbra Confidential Debt", "UCDEBT", "")
        Ownable(msg.sender)
    {}

    function setVault(address _vault) external onlyOwner {
        if (vaultSet)             revert VaultAlreadySet();
        if (_vault == address(0)) revert ZeroAddress();
        vault    = _vault;
        vaultSet = true;
        emit VaultSet(_vault);
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVault();
        _;
    }

    function mintDebt(address user, uint256 amount) external onlyVault {
        euint256 encAmount = Nox.toEuint256(amount);
        _mint(user, encAmount);
        _hasDebt[user] = true;
        emit DebtMinted(user);
    }

    function burnDebt(address user, uint256 amount) external onlyVault {
        euint256 encAmount = Nox.toEuint256(amount);
        _burn(user, encAmount);
        _hasDebt[user] = false;
        emit DebtBurned(user);
    }

    function getEncryptedDebt(address user) external view returns (bytes32) {
        return euint256.unwrap(confidentialBalanceOf(user));
    }

    function hasDebt(address user) external view returns (bool) {
        return _hasDebt[user];
    }
}