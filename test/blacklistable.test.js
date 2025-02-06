const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Blacklistable Contract Test", function () {
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
   
    it("Blacklistable - Deve impedir transações de endereços na blacklist", async function () {
        await token.addToBlacklist(addr1.address);
        await expect(token.connect(addr1).transfer(addr2.address, ethers.parseUnits("10", 18)))
            .to.be.revertedWith("Address is blacklisted");
    });

    it("Blacklistable - Deve permitir transferência após remover da blacklist", async function () {
        await token.addToBlacklist(addr1.address);
        await token.removeFromBlacklist(addr1.address);        
        await token.transfer(addr1.address, ethers.parseUnits("100", 18));

        await expect(token.connect(addr1).transfer(addr2.address, ethers.parseUnits("10", 18)))
            .to.not.be.reverted;
    });    

    it("Blacklistable - Deve emitir evento ao adicionar/remover da blacklist", async function () {
        await expect(token.addToBlacklist(addr1.address))
        .to.emit(token, "Blacklisted") // Nome correto do evento no contrato
        .withArgs(addr1.address);

        await expect(token.removeFromBlacklist(addr1.address))
        .to.emit(token, "Unblacklisted") // Nome correto do evento no contrato
        .withArgs(addr1.address);
    });

    it("Blacklistable - Deve impedir que o admin adicione a si mesmo à blacklist", async function () {
        await expect(token.addToBlacklist(owner.address))
            .to.be.revertedWith("Cannot blacklist admin"); // ✅ Atualizado com a mensagem correta
    });

    it("Blacklistable - Deve impedir adicionar um endereço já na blacklist novamente", async function () {
        await token.addToBlacklist(addr1.address);
        await expect(token.addToBlacklist(addr1.address))
            .to.be.revertedWith("Address already blacklisted");
    });

    it("Blacklistable - Deve impedir remover um endereço que não está na blacklist", async function () {
        await expect(token.removeFromBlacklist(addr1.address))
            .to.be.revertedWith("Address is not blacklisted");
    });
});
