import { ethers } from "ethers";
import MonopolyABI from "./abi/MonopolyAssets.json";
import { useEffect, useState } from "react";
import "./App.css";

const CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const ALLOWED_CHAIN_IDS = [31337, 1337];

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [assets, setAssets] = useState([]);
  const [debug, setDebug] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------- helpers IPFS ----------
// ---------- helpers IPFS ----------
const IPFS_GATEWAY = "https://pink-working-bear-503.mypinata.cloud/ipfs/";

const ipfsToHttp = (uri) => {
  if (!uri) return "";
  return uri.replace("ipfs://", IPFS_GATEWAY);
};




  const readableError = (e) =>
    e?.info?.error?.message ||
    e?.data?.message ||
    e?.reason ||
    e?.message ||
    "Erreur inconnue";

  // ---------- metamask events ----------
  useEffect(() => {
    if (!window.ethereum) return;

    const accChanged = (a) => setAccount(a?.[0] || null);
    const chainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", accChanged);
    window.ethereum.on("chainChanged", chainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", accChanged);
      window.ethereum.removeListener("chainChanged", chainChanged);
    };
  }, []);

  // ---------- connect ----------
  const connectWallet = async () => {
    setLoading(true);
    setDebug("");

    try {
      if (!window.ethereum) throw new Error("Installe MetaMask");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const net = await provider.getNetwork();

      if (!ALLOWED_CHAIN_IDS.includes(Number(net.chainId))) {
        throw new Error("Mauvais réseau (Localhost 8545 requis)");
      }

      const [acc] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const signer = await provider.getSigner();
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === "0x") throw new Error("Adresse contrat invalide");

      const c = new ethers.Contract(
        CONTRACT_ADDRESS,
        MonopolyABI.abi,
        signer
      );

      setAccount(acc);
      setContract(c);
      await loadAssets(c, acc);
    } catch (e) {
      setDebug(readableError(e));
    } finally {
      setLoading(false);
    }
  };

  // ---------- load assets (AVEC METADATA IPFS) ----------
const loadAssets = async (c = contract, acc = account) => {
  if (!c || !acc) return;

  setLoading(true);
  setDebug("");

  try {
    const max = Number(await c.getNextTokenId());
    const list = [];

    for (let id = 1; id < max; id++) {
      const asset = await c.getAsset(id);
      const bal = await c.balanceOf(acc, id);

      let metadata = null;
      try {
const res = await fetch(ipfsToHttp(asset.ipfsHash));
        if (res.ok) {
          metadata = await res.json();
           console.log(` Metadata asset ${id}:`, metadata);
        }
      } catch (e) {
        console.warn("Erreur IPFS metadata", e);
      }

      list.push({
        id,
        name: asset.name,
        valueWei: asset.value,
        valueEth: ethers.formatEther(asset.value),
        owned: bal.toString(),
        metadata,
      });
    }

    setAssets(list);
  } catch (e) {
    setDebug(readableError(e));
  } finally {
    setLoading(false);
  }
};


  // ---------- buy ----------
  const buy = async (asset) => {
    if (!contract) return;

    setLoading(true);
    setDebug("");

    try {
      const tx = await contract.buyAsset(asset.id, {
        value: asset.valueWei,
      });
      await tx.wait();
      await loadAssets();
    } catch (e) {
      setDebug(readableError(e));
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  return (
    <div className="App">
      <h1> Monopoly DApp</h1>

      {!account ? (
        <button onClick={connectWallet} disabled={loading}>
          Connect Wallet
        </button>
      ) : (
        <>
          <p>Wallet : {account}</p>
          <button onClick={() => loadAssets()} disabled={loading}>
            Charger assets
          </button>
        </>
      )}

      {debug && <p className="debug">{debug}</p>}

      <div className="assets">
        {assets.map((a) => (
          <div key={a.id} className="asset-card">
            <h3>{a.name}</h3>
            <p>ID: {a.id}</p>
            <p>ETH: {a.valueEth}</p>
            <p>Possédé: {a.owned}</p>

         
          {a.metadata?.image && (
  <>
    <p style={{ fontSize: "12px" }}>
      Image IPFS: {a.metadata.image}
    </p>

    <img
      src={ipfsToHttp(a.metadata.image)}
      alt={a.name}
      style={{
        width: "200px",
        borderRadius: "8px",
        marginTop: "10px",
        border: "1px solid #ccc",
      }}
      onError={(e) => {
        console.error("Erreur image IPFS", a.metadata.image);
        e.target.style.display = "none";
      }}
    />
  </>
)}

            <button onClick={() => buy(a)} disabled={loading}>
              Acheter
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
