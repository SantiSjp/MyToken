const { ethers, upgrades } = require("hardhat");

async function main() {
    const initialSupply = ethers.parseUnits("1000000", 18); // 1 milhão de tokens
    const cap = ethers.parseUnits("2000000", 18); // 2 milhões de tokens no máximo
    const rewardRate = ethers.parseUnits("0.0001", 18); // Taxa de recompensa para staking

    console.log("🚀 Deployando VavaToken...");

    const VavaToken = await ethers.getContractFactory("VavaToken");
    const vavaToken = await upgrades.deployProxy(VavaToken, [initialSupply, cap], { initializer: "initialize" });
    await vavaToken.waitForDeployment();

    console.log("✅ VavaToken deployado!");
    console.log("📍 Endereço do contrato VavaToken:", await vavaToken.getAddress());    
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
