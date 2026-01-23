import { ethers } from "ethers";
import MonopolyABI from "./abi/MonopolyAssets.json";
import { useState } from "react";
import "./App.css";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Installe Metamask !");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setAccount(accounts[0]);

    const monopolyContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      MonopolyABI.abi,
      signer
    );

    setContract(monopolyContract);

    console.log("Contrat chargé :", monopolyContract);
    console.log("Wallet :", accounts[0]);
  };

  return (
    <div className="App">
      <h1>Monopoly DApp</h1>

      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>Wallet connecté : {account}</p>
      )}
    </div>
  );
}

export default App;
