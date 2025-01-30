const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Token Contract Test", function () {
    let Token, token, owner, addr1, addr2, addr3;

    const initialSupply = 1000000;
    const cap = ethers.parseUnits("5000000", 18);

    // ✅ Definir as taxas de queima corretamente
    const burnRateTx = 150; // 1.5% (Base 10000)
    const burnRateStaking = 300; // 3% (Base 10000)

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
    });

    it("Deve inicializar corretamente o contrato", async function () {
        expect(await token.name()).to.equal("Test Token");
        expect(await token.symbol()).to.equal("TST");
        expect((await token.totalSupply()).toString()).to.equal(
            ethers.parseUnits(initialSupply.toString(), 18).toString()
        );
        expect((await token.cap()).toString()).to.equal(cap.toString());
    });     

    it("Deve impedir transações de endereços na blacklist", async function () {
        await token.addToBlacklist(addr1.address);
        await expect(token.connect(addr1).transfer(addr2.address, ethers.parseUnits("10", 18)))
            .to.be.revertedWith("Address is blacklisted");
    });

    it("Deve pausar e despausar corretamente", async function () {
        await token.pause();
    
        expect(await token.paused()).to.be.true;   
    
        await token.unpause();
    
        expect(await token.paused()).to.be.false;   
    });

    it("Deve impedir transferências quando pausado", async function () {
        await token.pause();
    
        expect(await token.paused()).to.be.true;      
    
        await expect(token.transfer(addr1.address, ethers.parseUnits("10", 18)))
            .to.be.revertedWithCustomError(token, "EnforcedPause");   
    });

    it("Deve impedir minting acima do cap", async function () {
        await expect(token.mint(addr1.address, cap)).to.be.revertedWith("Cap exceeded");
    });

    it("Deve permitir um administrador fazer mint corretamente", async function () {
        await token.mint(addr1.address, ethers.parseUnits("1000", 18));
        expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseUnits("1000", 18));
    });

    it("Deve impedir minting por usuário sem permissão", async function () {
        await expect(token.connect(addr1).mint(addr1.address, ethers.parseUnits("1000", 18)))
    .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Deve registrar corretamente o tempo da última transação", async function () {
        expect(await token.balanceOf(owner.address)).to.be.above(ethers.parseUnits("10", 18));
    
        await token.transfer(addr1.address, ethers.parseUnits("10", 18));
        await ethers.provider.send("evm_mine");
    
        const lastTxTime = await token.getLastTransactionTime(owner.address);
        expect(lastTxTime).to.be.above(0);
    });    

    it("Deve queimar 1.5% do valor transferido", async function () {
        const transferAmount = ethers.parseUnits("1000", 18);
        const burnRateTx = 150; // 1.5% (Base 10000)
    
        const expectedBurn = (transferAmount * BigInt(burnRateTx)) / BigInt(10000);
        const expectedFinalAmount = transferAmount - expectedBurn;
    
        const initialBalanceAddr1 = await token.balanceOf(addr1.address);
        const initialTotalSupply = await token.totalSupply();
    
        await token.transfer(addr1.address, transferAmount);
    
        const finalBalanceAddr1 = await token.balanceOf(addr1.address);
        const finalTotalSupply = await token.totalSupply();
    
        // ✅ Verifica se o destinatário recebeu o valor correto após a queima
        expect(finalBalanceAddr1).to.equal(initialBalanceAddr1 + expectedFinalAmount);
    
        // ✅ Verifica se o totalSupply diminuiu corretamente devido à queima
        expect(finalTotalSupply).to.equal(initialTotalSupply - expectedBurn);
    });
    
});
