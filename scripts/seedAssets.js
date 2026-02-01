const { ethers } = require("hardhat");

function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function main() {
  const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  const [deployer] = await ethers.getSigners();
  const assets = await ethers.getContractAt("MonopolyAssets", CONTRACT);

  const list = [
    {
      name: "Gare du Nord",
      type: 1,
      value: 200,
       ipfs: "ipfs://bafkreiec54puwegsfr2jheyhkaywkd3vy34627abzvkn5ujdsftwztq4fm"
    },
    {
      name: "Gare de Lyon",
      type: 1,
      value: 200,
       ipfs: "ipfs://bafkreibjgezjszm4gl42dsihgd22jgdyguyyhjdy2y5stytr4epn25i22u"
    },
    {
      name: "Rue de la Paix",
      type: 0,
      value: 400,
      ipfs: "ipfs://bafkreiesiygdbt6q5ycklwwfahzksdafion5m4vkfdnp2v2y35lyoa5pkm"
    }

  ];

  console.log("  Création des assets...");
  
  for (const a of list) {
    const tx = await assets.createAsset(a.name, a.type, a.value, a.ipfs);
    await tx.wait();
    console.log(`  Créé: ${a.name}`);
  }

  console.log("\  Minting des assets vers:", deployer.address);
  
  for (let i = 0; i < list.length; i++) {
    const tokenId = i + 1;
    const mintTx = await assets.mintTo(deployer.address, tokenId, 1);
    await mintTx.wait();
    console.log(`  Asset ${tokenId} minté (${list[i].name})`);
    
    if (i < list.length - 1) {
      await sleep(3);
    }
  }

  console.log("\  Seed terminé !");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});