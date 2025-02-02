const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Token Contract Test", function () {
    let Token, token, owner, addr1, addr2, addr3;

    const initialSupply = ethers.parseUnits("1000000", 18);
    const cap = ethers.parseUnits("2000000", 18);

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

    it("Token - Deve inicializar corretamente o contrato", async function () {
        expect(await token.name()).to.equal("Test Token");
        expect(await token.symbol()).to.equal("TST");
        expect((await token.totalSupply()).toString()).to.equal(initialSupply.toString());
        expect((await token.cap()).toString()).to.equal(cap.toString());
    });     

    it("Token - Deve impedir transações de endereços na blacklist", async function () {
        await token.addToBlacklist(addr1.address);
        await expect(token.connect(addr1).transfer(addr2.address, ethers.parseUnits("10", 18)))
            .to.be.revertedWith("Address is blacklisted");
    });

    it("Token - Deve pausar e despausar corretamente", async function () {
        await token.pause();
    
        expect(await token.paused()).to.be.true;   
    
        await token.unpause();
    
        expect(await token.paused()).to.be.false;   
    });

    it("Token - Deve impedir transferências quando pausado", async function () {
        await token.pause();
    
        expect(await token.paused()).to.be.true;      
    
        await expect(token.transfer(addr1.address, ethers.parseUnits("10", 18)))
            .to.be.revertedWithCustomError(token, "EnforcedPause");   
    });

    it("Token - Deve impedir minting acima do cap", async function () {
        await expect(token.mint(addr1.address, cap)).to.be.revertedWith("Cap exceeded");
    });

    it("Token - Deve permitir um administrador fazer mint corretamente", async function () {
        await token.mint(addr1.address, ethers.parseUnits("1000", 18));
        expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseUnits("1000", 18));
    });

    it("Token - Deve impedir minting por usuário sem permissão", async function () {
        await expect(token.connect(addr1).mint(addr1.address, ethers.parseUnits("1000", 18)))
    .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Token - Deve registrar corretamente o tempo da última transação", async function () {
        expect(await token.balanceOf(owner.address)).to.be.above(ethers.parseUnits("10", 18));
    
        await token.transfer(addr1.address, ethers.parseUnits("10", 18));
        await ethers.provider.send("evm_mine");
    
        const lastTxTime = await token.getLastTransactionTime(owner.address);
        expect(lastTxTime).to.be.above(0);
    });       
    
});
