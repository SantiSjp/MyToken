// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Módulo de Blacklist
/// @notice Permite adicionar e remover endereços da blacklist
abstract contract Blacklistable is AccessControlUpgradeable {
    mapping(address => bool) private _blacklist;

    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);

    /// @notice Adiciona um endereço à blacklist
    function addToBlacklist(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != msg.sender, "Cannot blacklist admin");
        require(!_blacklist[account], "Address already blacklisted");
        _blacklist[account] = true;
        emit Blacklisted(account);
    }

    /// @notice Remove um endereço da blacklist
    function removeFromBlacklist(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_blacklist[account], "Address is not blacklisted");
        _blacklist[account] = false;
        emit Unblacklisted(account);
    }

    /// @notice Verifica se um endereço está na blacklist
    function isBlacklisted(address account) public view returns (bool) {
        return _blacklist[account];
    }

    /// @notice Modificador que impede transferências de contas na blacklist
    modifier notBlacklisted(address account) {
        require(!_blacklist[account], "Address is blacklisted");
        _;
    }
}