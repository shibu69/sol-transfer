import { useEffect, useState } from "react";
import "./App.css";
import {
  Keypair,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";

// Initialize Solana connection
const connection = new Connection(clusterApiUrl("testnet"), "confirmed");

// Utility function to get Phantom provider
const getProvider = () => {
  if ("solana" in window) {
    const provider = window.solana;
    if (provider.isPhantom) return provider;
  }
  return undefined;
};

function App() {
  const [provider, setProvider] = useState(undefined);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [walletKey, setWalletKey] = useState(null);
  const [signature, setSignature] = useState(null);
  const [keyPair, setKeyPair] = useState(null);
  const [error, setError] = useState(null);
  const [showGenerate, setShowGenerate] = useState(true);
  const [showAirdrop, setShowAirdrop] = useState(false);
  const [transaction, setTransaction] = useState(null);

  // Initialize provider on component mount
  useEffect(() => {
    const provider = getProvider();
    setProvider(provider);
  }, []);

  // Generate a new wallet
  const generateWallet = () => {
    try {
      const keyPair = Keypair.generate();
      setPublicKey(keyPair.publicKey.toString());
      setKeyPair(keyPair);
      setShowGenerate(false);
      setShowAirdrop(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Request airdrop of SOL
  const airdropSol = async () => {
    if (publicKey) {
      try {
        const fromAirdropSignature = await connection.requestAirdrop(
          new PublicKey(publicKey),
          2 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(fromAirdropSignature);
        setSignature(fromAirdropSignature);
        setShowAirdrop(false);
      } catch (err) {
        if (err.message.includes("429")) {
          setError(
            "You have requested too many airdrops. Please wait 24 hours."
          );
        } else {
          setError(err.message);
        }
        console.log(err);
      }
    } else {
      setError("Generate a wallet address first.");
    }
  };

  // Connect Phantom wallet
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      try {
        const response = await solana.connect();
        setWalletKey(response.publicKey);
        setConnected(true);
      } catch (err) {
        setError(err.message);
      }
    } else {
      setError("Phantom wallet not detected");
    }
  };

  // Transfer SOL
  const transferSol = async () => {
    if (keyPair && walletKey) {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keyPair.publicKey,
          toPubkey: walletKey,
          lamports: 1 * LAMPORTS_PER_SOL,
        })
      );

      try {
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [keyPair]
        );
        console.log("Transfer signature:", signature);
        setTransaction(signature);
      } catch (err) {
        setError(err.message);
      }
    } else {
      setError("Generate and connect wallet first.");
    }
  };

  // Disconnect Phantom wallet
  const disconnectWallet = async () => {
    const { solana } = window;

    if (connected && solana) {
      await solana.disconnect();
      setConnected(false);
      setWalletKey(null);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>GET SOLANA BY NEW WALLET</h1>
      </header>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="actions">
        {showGenerate && (
          <button onClick={generateWallet}>Generate Wallet</button>
        )}

        {!showGenerate && publicKey && (
          <>
            <h3>Generated Wallet Address: {publicKey}</h3>
            {showAirdrop && <button onClick={airdropSol}>Airdrop SOL</button>}
            {signature && <p>Airdrop Signature: {signature}</p>}
          </>
        )}

        {!connected && !showGenerate && !showAirdrop && (
          <button onClick={connectWallet}>Connect Phantom Wallet</button>
        )}

        {connected && (
          <>
            <h3>Connected Wallet Address: {walletKey.toString()}</h3>
            <button onClick={transferSol}>
              Transfer 1 SOL to Connected Wallet
            </button>

            <button className="disconnect" onClick={disconnectWallet}>
              Disconnect Wallet
            </button>

            <h3>Transferres 1 sol signature : {transaction}</h3>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
