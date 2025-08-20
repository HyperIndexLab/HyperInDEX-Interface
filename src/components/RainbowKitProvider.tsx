'use client';

import '@rainbow-me/rainbowkit/styles.css';

import {
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { fallback, http, WagmiProvider } from 'wagmi'

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
	hashkeyTestnet,
} from 'wagmi/chains';
import { metaMaskWallet, okxWallet } from '@rainbow-me/rainbowkit/wallets';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { particleWallet, particleGoogleWallet, particleTwitterWallet } from './ParticleWallet';

console.log(process.env.BUILD_ENV, 'process.env.BUILD_ENV');

export const MAINNET_CHAIN_ID = 196;
const OKXMainnet = {
	id: MAINNET_CHAIN_ID,
	name: 'X Layer Mainnet',
	nativeCurrency: {
		decimals: 18,
		name: 'OKX',
		symbol: 'OKB',
	},
	rpcUrls: {
		default: {
			http: ['https://endpoints.omniatech.io/v1/xlayer/mainnet/public'],
		},
		public: {
			http: ['https://xlayerrpc.okx.com'],
		}
	},
	blockExplorers: {
		default: {
			name: 'OKX Layer Explorer',
			url: 'https://web3.okx.com/zh-hans/explorer/x-layer',
		},
	},
}

const wagmiConfig = getDefaultConfig({
	appName: 'RainbowKit demo',
	projectId: 'YOUR_PROJECT_ID',
	wallets: [
		{
			groupName: 'Recommended',
			wallets: [
				metaMaskWallet, 
				okxWallet,
				particleWallet,
				particleGoogleWallet,
				particleTwitterWallet,
			],
		},
	],
	chains: [
		process.env.BUILD_ENV === 'test' ? OKXMainnet : OKXMainnet,
	],
	transports: {
		[OKXMainnet.id]: fallback([
			http('https://endpoints.omniatech.io/v1/xlayer/mainnet/public'),
			http('https://xlayerrpc.okx.com'),
		]),
	},
	ssr: true,
});
		
const RainbowKitWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const queryClient = new QueryClient();
	return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
					{children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );};

export {
	wagmiConfig
}

export default RainbowKitWrapper;