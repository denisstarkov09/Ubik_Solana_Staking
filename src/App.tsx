import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { SnackbarProvider } from 'notistack';
import {
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
  getSolletExtensionWallet,
  getSolletWallet,
  // getTorusWallet,
  // getLedgerWallet,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
// import {WalletConnect} from './wallet'
// import Mint from './pages/mint'
import Stake from './pages/stake'
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

export default function App(){
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [
    getPhantomWallet(),
    getSolflareWallet(),
    getSlopeWallet(),
    getSolletWallet(),
    getSolletExtensionWallet(),
    // getTorusWallet(),
    // getLedgerWallet(),
  ], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <SnackbarProvider>
              {/* <div>
                <WalletConnect />
              </div> */}
              <Stake/>  
            </SnackbarProvider>
          </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );  
}