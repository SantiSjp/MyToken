require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Token...");

    // Parâmetros de inicialização do contrato
    const tokenName = "TToken4";
    const tokenSymbol = "TTT4";
    const initialSupply = 1000000 // 1 milhão de tokens
    const cap = 2000000 // 10 milhões de tokens como limite

    // Obter conta de deploy
    const [deployer] = await ethers.getSigners();
    console.log("📡 Deploying from:", deployer.address);

    // Instanciar e fazer deploy do contrato upgradeável
    const Token = await ethers.getContractFactory("Token");
    const token = await upgrades.deployProxy(Token, [tokenName, tokenSymbol, initialSupply, cap], {
        initializer: "initialize",
    });

    await token.waitForDeployment();
    console.log("✅ Token deployed at:", await token.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
