// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract Stakable is Initializable, AccessControlUpgradeable  {
    ERC20Upgradeable public stakingToken;

    struct StakeInfo {
        uint256 amount;
        uint256 lastUpdated;
        uint256 rewards;
    }

    mapping(address => StakeInfo) private _stakes;
    uint256 public rewardRate; // Exemplo: 10% ao ano (0.1 * 1e18)

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRate);

    function __Stakable_init() internal initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        stakingToken = ERC20Upgradeable(address(this));
        rewardRate = 10 * 1e16; // 10% ao ano (0.1 * 1e18)
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Staking amount must be greater than zero");
        
        StakeInfo storage userStake = _stakes[msg.sender];

        // Atualiza recompensas antes de modificar o valor
        userStake.rewards += _calculateRewards(msg.sender);
        userStake.lastUpdated = block.timestamp;
        userStake.amount += amount;

        stakingToken.transferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        StakeInfo storage userStake = _stakes[msg.sender];
        require(userStake.amount >= amount, "Not enough staked balance");

        // Atualiza recompensas antes de modificar o valor
        userStake.rewards += _calculateRewards(msg.sender);
        userStake.lastUpdated = block.timestamp;
        userStake.amount -= amount;

        stakingToken.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external {
        uint256 rewards = _calculateRewards(msg.sender) + _stakes[msg.sender].rewards;
        require(rewards > 0, "No rewards available");

        _stakes[msg.sender].lastUpdated = block.timestamp;
        _stakes[msg.sender].rewards = 0;

        stakingToken.transfer(msg.sender, rewards);
        emit RewardsClaimed(msg.sender, rewards);
    }

    function _calculateRewards(address user) internal view returns (uint256) {
        StakeInfo memory userStake = _stakes[user];
        if (userStake.amount == 0) return 0;

        uint256 timeStaked = block.timestamp - userStake.lastUpdated;
        return (userStake.amount * rewardRate * timeStaked) / (365 days * 1e18);
    }

    function setRewardRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }

    function getStakingInfo(address user) external view returns (uint256 amount, uint256 rewards) {
        return (_stakes[user].amount, _calculateRewards(user) + _stakes[user].rewards);
    }
}
