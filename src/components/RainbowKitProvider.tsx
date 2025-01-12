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


	// 自定义一个网络
	// const hashkeyMainnet = {
	// 	id: 10000,
	// 	name: 'Hashkey Mainnet',
	// 	iconUrl: 'https://hashkey.com/favicon.ico',
	// 	nativeCurrency: {
	// 		decimals: 18,
	// 		name: 'Hashkey',
	// 		symbol: 'HK',
	// 	},
	// 	rpcUrls: {
	// 		default: {
	// 			http: ['https://mainnet.hashkey.com'],
	// 		},
	// 	},
	// } as const satisfies Chain;

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
			// hashkeyMainnet,
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