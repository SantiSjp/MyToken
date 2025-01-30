// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "hardhat/console.sol";


abstract contract Burnable is Initializable, AccessControlUpgradeable, ERC20Upgradeable  {
    ERC20Upgradeable public burnToken;

    uint256 public constant TRANSACTION_BURN_RATE = 150; // 1.5% (Base 10000)

    event TokensBurned(address indexed from, uint256 amount);

    function __Burnable_init() internal initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        burnToken = ERC20Upgradeable(address(this));
    }

    // Queima aplicada a transações
    function _burnOnTransfer(address sender, uint256 amount) internal returns (uint256) {
        uint256 burnAmount = (amount * TRANSACTION_BURN_RATE) / 10000;      

        if (burnAmount > 0) {
            _burn(sender, burnAmount);
            emit TokensBurned(sender, burnAmount);
        }
        return amount - burnAmount;
    }    
}