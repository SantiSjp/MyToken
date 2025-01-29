const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Token Contract", function () {
    let Token, token, owner, addr1, addr2, addr3;

    const initialSupply = 1000000; // ✅ Passamos o número puro
    const cap = ethers.parseUnits("5000000", 18); // ✅ Multiplicamos para 10^18

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        Token = await ethers.getContractFactory("Token");
        token = await upgrades.deployProxy(Token, [
            "Test Token",
            "TST",
            initialSupply, // ✅ O contrato já multiplica esse valor
            cap // ✅ Passamos já multiplicado
        ], { initializer: "initialize" });

        await token.waitForDeployment();
    });

    it("Deve inicializar corretamente o contrato", async function () {
        expect(await token.name()).to.equal("Test Token");
        expect(await token.symbol()).to.equal("TST");

        // ✅ Agora comparamos corretamente
        expect((await token.totalSupply()).toString()).to.equal(
            ethers.parseUnits(initialSupply.toString(), 18).toString()
        );

        expect((await token.cap()).toString()).to.equal(cap.toString());
    });
});
