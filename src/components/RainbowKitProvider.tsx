'use client';

import '@rainbow-me/rainbowkit/styles.css';

import {
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi'

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
	hashkeyTestnet,
} from 'wagmi/chains';
import { metaMaskWallet, okxWallet } from '@rainbow-me/rainbowkit/wallets';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
		
const RainbowKitWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const queryClient = new QueryClient();


	const wagmiConfig = getDefaultConfig({
		appName: 'RainbowKit demo',
		projectId: 'YOUR_PROJECT_ID',
		wallets: [
			{
				groupName: 'Recommended',
				wallets: [metaMaskWallet, okxWallet],
			},
		],
		chains: [
			hashkeyTestnet,
		],
		ssr: true,
	});

	return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
					{children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );};

export default RainbowKitWrapper;