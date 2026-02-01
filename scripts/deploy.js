const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Déploiement avec le compte :", deployer.address);

  const MonopolyAssets = await hre.ethers.getContractFactory("MonopolyAssets");
  const contract = await MonopolyAssets.deploy();

  await contract.waitForDeployment();

  console.log("MonopolyAssets déployé à :", await contract.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
