// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./Blacklistable.sol";

/// @title Token Upgradeável com Blacklist e Proteção contra Reentrância
contract Token is AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, ERC20Upgradeable, Blacklistable  {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _cap;

    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => Stake) public stakes;
    mapping(address => uint256) private _lastTransactionTime;

    uint256 public constant APY = 15; // 15% ao ano
    uint256 public constant SECONDS_IN_YEAR = 365 days;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 rewards);   
    event TransferAttempt(address indexed from, address indexed to, uint256 amount, uint256 timestamp);

    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 cap_
    ) public initializer {
        require(cap_ > 0, "Cap must be greater than 0");

        __Pausable_init();              
        __ReentrancyGuard_init();       
        __ERC20_init(name, symbol);      
        __AccessControl_init();   

        _cap = cap_;
        _mint(msg.sender, initialSupply);

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

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        _transfer(msg.sender, address(this), amount);

        // Se já tiver stake, acumula as recompensas antes de atualizar
        if (stakes[msg.sender].amount > 0) {
            stakes[msg.sender].amount += amount;
        } else {
            stakes[msg.sender] = Stake(amount, block.timestamp);
        }

        emit Staked(msg.sender, amount);
    }

    function unstake() external nonReentrant {
        Stake storage stakeInfo = stakes[msg.sender];
        require(stakeInfo.amount > 0, "No stake found");

        uint256 amount = stakeInfo.amount;
        uint256 reward = calculateReward(msg.sender);

        stakeInfo.amount = 0;
        _mint(msg.sender, reward); // Recompensa
        _transfer(address(this), msg.sender, amount); // Retorno do stake

        emit Unstaked(msg.sender, amount, reward);
    }

    function calculateReward(address user) public view returns (uint256) {
        Stake storage stakeInfo = stakes[user];
        if (stakeInfo.amount == 0) return 0;

        uint256 timeStaked = block.timestamp - stakeInfo.timestamp;
        uint256 reward = (stakeInfo.amount * APY * timeStaked) / (100 * SECONDS_IN_YEAR);
        return reward;
    }

    /// @notice Autoriza upgrades apenas pelo administrador
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
