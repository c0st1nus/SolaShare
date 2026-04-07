"use client";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Use localnet for development (Surfpool + localnet setup)
  const endpoint = useMemo(() => {
    const localnetUrl = "http://localhost:8899";
    // You can also use devnet: clusterApiUrl(WalletAdapterNetwork.Devnet)
    return localnetUrl;
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
