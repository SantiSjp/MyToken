const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Burnable Contract Test", function () {
    let Token, token, owner, addr1, addr2, addr3;

    const initialSupply = 1000000;
    const cap = ethers.parseUnits("5000000", 18);
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
   
    it("Burnable - Deve queimar 1.5% do valor transferido", async function () {
        const transferAmount = ethers.parseUnits("1000", 18);
        const expectedBurn = (transferAmount * BigInt(burnRateTx)) / BigInt(10000);
        const expectedFinalAmount = transferAmount - expectedBurn;

        const initialBalanceAddr1 = await token.balanceOf(addr1.address);
        const initialTotalSupply = await token.totalSupply();

        await token.transfer(addr1.address, transferAmount);

        const finalBalanceAddr1 = await token.balanceOf(addr1.address);
        const finalTotalSupply = await token.totalSupply();

        expect(finalBalanceAddr1).to.equal(initialBalanceAddr1 + expectedFinalAmount);
        expect(finalTotalSupply).to.equal(initialTotalSupply - expectedBurn);
    });  
});
