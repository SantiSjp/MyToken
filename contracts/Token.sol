// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./Blacklistable.sol";
import "./Stakable.sol";

/// @title Token Upgradeável com Blacklist e Proteção contra Reentrância
contract Token is ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, Blacklistable, Stakable  {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _cap;
    mapping(address => uint256) private _lastTransactionTime;

    event TransferAttempt(address indexed from, address indexed to, uint256 amount, uint256 timestamp);

    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 cap_
    ) public initializer {
        require(cap_ > 0, "Cap must be greater than 0");

        __ERC20_init(name, symbol);
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Stakable_init();

        _cap = cap_;
        _mint(msg.sender, initialSupply * 10 ** decimals());

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function cap() public view returns (uint256) {
        return _cap;
    }  

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function getLastTransactionTime(address account) external view returns (uint256) {
        return _lastTransactionTime[account];
    }

    /// @notice Modificador para validar transferências
    modifier beforeTransferCheck(address from, address to, uint256 amount) {
        require(!isBlacklisted(from) && !isBlacklisted(to), "Address is blacklisted");
        _;
    }

     /// @notice Transferência protegida com verificações
    function transfer(address to, uint256 amount) public beforeTransferCheck(msg.sender, to, amount) whenNotPaused override returns (bool) {
        _lastTransactionTime[msg.sender] = block.timestamp;
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public beforeTransferCheck(from, to, amount) whenNotPaused override returns (bool) {
        _lastTransactionTime[from] = block.timestamp;
        return super.transferFrom(from, to, amount);
    }

    /// @notice Criação de novos tokens protegida contra reentrância
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) whenNotPaused notBlacklisted(to) nonReentrant {
        require(totalSupply() + amount <= _cap, "Cap exceeded");
        _mint(to, amount);
    }    

    /// @notice Autoriza upgrades apenas pelo administrador
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
