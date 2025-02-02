const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Stakable Contract Test", function () {
    let Token, token, owner, addr1, addr2, addr3;

    const initialSupply = ethers.parseUnits("1000000", 18);
    const cap = ethers.parseUnits("2000000", 18);
    const stakeAmount = ethers.parseUnits("100", 18);
    const APY = 15; // 15% de recompensa ao ano
    const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        Token = await ethers.getContractFactory("Token");
        token = await upgrades.deployProxy(Token, [
            "Test Token",
            "TST",
            initialSupply,
            cap
        ], { initializer: "initialize" });

        await token.waitForDeployment();

        await token.transfer(addr1.address, ethers.parseUnits("1000", 18)); // 1000 tokens para addr1
    });
   
    it("Stakable - Deve permitir que o usuário faça staking", async function () {
        await token.connect(addr1).stake(stakeAmount);
        const stakeInfo = await token.stakes(addr1.address);
        expect(stakeInfo.amount).to.equal(stakeAmount);
    });
    
    it("Stakable - Deve calcular corretamente a recompensa do staking", async function () {
        await token.connect(addr1).stake(stakeAmount);

        // Avançar o tempo (simular 1 ano de staking)
        await ethers.provider.send("evm_increaseTime", [SECONDS_IN_YEAR]);
        await ethers.provider.send("evm_mine");

        const reward = await token.calculateReward(addr1.address);
        const expectedReward = stakeAmount * BigInt(APY) / BigInt(100); // 15% de recompensa

        expect(reward).to.be.closeTo(expectedReward, ethers.parseUnits("0.1", 18)); // Margem de erro mínima
    });

    it("Stakable - Deve permitir que o usuário retire tokens + recompensa", async function () {
        await token.connect(addr1).stake(stakeAmount);

        // Avançar o tempo (simular 1 ano de staking)
        await ethers.provider.send("evm_increaseTime", [SECONDS_IN_YEAR]);
        await ethers.provider.send("evm_mine");

        // Verificar saldo antes do unstake
        const balanceBefore = await token.balanceOf(addr1.address);

        // Retirar stake e recompensa
        await token.connect(addr1).unstake();

        // Verificar saldo depois do unstake
        const balanceAfter = await token.balanceOf(addr1.address);
        expect(balanceAfter).to.be.gt(balanceBefore); // O saldo deve aumentar com as recompensas
    });

    it("Stakable - Não deve permitir staking de 0 tokens", async function () {
        await expect(token.connect(addr1).stake(0)).to.be.revertedWith("Cannot stake 0");
    });

    it("Stakable - Não deve permitir unstake sem tokens staked", async function () {
        await expect(token.connect(addr1).unstake()).to.be.revertedWith("No stake found");
    });
});
