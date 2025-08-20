"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Personal from "./Personal";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useConnect as useParticleConnect } from '@particle-network/auth-core-modal';
import { AuthCoreEvent, getLatestAuthType, isSocialAuthType, particleAuth, SocialAuthType } from "@particle-network/auth-core";
import { particleWagmiWallet } from "./ParticleWallet/particleWagmiWallet";
import { switchChain } from '@wagmi/core'
import { MAINNET_CHAIN_ID, wagmiConfig } from "./RainbowKitProvider";

type MenuItem = {
  path: string;
  label: string;
  target?: string;
  rel?: string;
  children?: MenuItem[];
};

const MENU_MAP: MenuItem[] = [
  {
    path: "/",
    label: "Trade",
  },
  {
    path: "/explore/pools",
    label: "Pools",
  },
  {
    path: "/explore/tokens",
      label: "Tokens",
    },
  {
    path: "/user/liquidity",
    label: "My Pool",
  },
];

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [open, setOpen] = useState(false);

  const { connect } = useConnect();
  const { connectionStatus } = useParticleConnect();
  const { disconnect } = useDisconnect();
  
  // 添加网络切换相关的状态和函数
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  
  // const chainId = useChainId();
  const { isConnected, address } = useAccount();
  // 检查网络并在需要时自动切换
  useEffect(() => {
    const switchNetwork = async () => {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const chainIdInt = parseInt(chainId || '0', 16);

      const changeChaindId = process.env.BUILD_ENV === 'test' ? MAINNET_CHAIN_ID : MAINNET_CHAIN_ID;
   
      if (chainIdInt !== changeChaindId) {
        setIsWrongNetwork(true);
        try {
          await switchChain(wagmiConfig, { chainId: changeChaindId });
          setIsWrongNetwork(false);
        } catch (error) {
          console.error('切换链失败：', error);
        }
        
      } else {
        setIsWrongNetwork(false);
      }
    };

    if (isConnected && address) {
      switchNetwork();
    }
  }, [switchChain, isConnected, address]);

  useEffect(() => {
    if (connectionStatus === 'connected' && isSocialAuthType(getLatestAuthType())) {
        connect({
            connector: particleWagmiWallet({ socialType: getLatestAuthType() as SocialAuthType }),
        });
    }
    const onDisconnect = () => {
        disconnect();
    };
    particleAuth.on(AuthCoreEvent.ParticleAuthDisconnect, onDisconnect);
    return () => {
        particleAuth.off(AuthCoreEvent.ParticleAuthDisconnect, onDisconnect);
    };
  }, [connect, connectionStatus, disconnect]);

  

  return (
    <div className="w-full top-0 z-50 font-sora">
      <div className="navbar h-14 max-w-[1200px] mx-auto px-4">
        {/* Logo 部分 - 在最左侧 */}
        <div className="flex-none">
          <Link href="/" className="flex items-center mr-8">
            <Image src={'/img/logo.png'} alt="logo" width={60} height={60} />
          </Link>
        </div>

        {/* 菜单部分 - 在logo右侧 */}
        <div className="flex-none hidden lg:block">
          <ul className="flex items-center gap-1 font-sora">
            {MENU_MAP.map((item) => (
              <li key={item.path} className="relative">
                {!item.children ? (
                  <Link
                    href={item.path}
                    target={item.target}
                    rel={item.rel}
                    className={`px-4 py-2 transition-colors ${
                      pathname === item.path 
                        ? "text-white font-medium" 
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <div className="group">
                    <button
                      className="px-4 py-2 text-gray-400 hover:text-gray-200"
                    >
                      {item.label}
                    </button>
                    
                    {/* 简化的二级菜单 - 类似图片风格 */}
                    <div className="absolute left-0 top-full pt-2">
                      <div className="bg-base-200/95 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden w-48 hidden group-hover:block border border-gray-700/30">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            href={child.path}
                            target={child.target}
                            rel={child.rel}
                            className={`block px-4 py-2.5 hover:bg-gray-700/20 transition-colors ${
                              pathname === child.path ? "text-white font-medium" : "text-gray-400"
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* 空白填充区域 */}
        <div className="flex-1"></div>

        {/* 钱包按钮 */}
        <div className="flex-none flex items-center gap-4 ml-4">
          <div className="lg:hidden">
            <label
              htmlFor="my-drawer"
              className="btn btn-ghost btn-sm btn-circle"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </label>
          </div>
          <div className="relative">
            <ConnectButton.Custom>
              {({ openConnectModal, account, chain }) => {
                if (!account || !chain) {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="font-sora bg-primary hover:bg-primary-focus text-white rounded-full px-5 h-10 text-sm font-medium transition-colors flex items-center justify-center"
                    >
                      Connect Wallet
                    </button>
                  );
                }
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOpen(true)}
                      className="font-sora bg-neutral hover:bg-neutral-focus text-white rounded-full px-5 h-10 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-success"></div>
                      {account.displayName}
                    </button>
                    {isWrongNetwork && (
                      <div className="top-full text-center">
                        <span className="text-error text-sm">Wrong Network</span>
                      </div>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
          <Personal isOpen={open} setOpen={setOpen} />
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className="drawer">
        <input
          id="my-drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={isMobileMenuOpen}
          onChange={(e) => setIsMobileMenuOpen(e.target.checked)}
        />
        <div className="drawer-side z-[100]">
          <label htmlFor="my-drawer" className="drawer-overlay"></label>
          <div className="w-full max-w-[320px] min-h-screen bg-base-200/90 backdrop-blur-md text-base-content font-sora">
            {/* 关闭按钮 */}
            <div className="sticky top-0 flex justify-between items-center p-4 border-b border-gray-800">
              <span className="text-lg font-medium text-white">Menu</span>
              <button
                className="btn btn-ghost btn-circle"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 菜单列表 */}
            <div className="p-4">
              <ul className="space-y-2">
                {MENU_MAP.map((item) => (
                  <li key={item.path}>
                    {!item.children ? (
                      <Link
                        href={item.path}
                        className={`block p-3 text-base transition-colors ${
                          pathname === item.path
                            ? "text-white font-medium"
                            : "text-gray-400 hover:text-gray-200"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <details className="group">
                        <summary
                          className={`w-full p-3 text-base transition-colors cursor-pointer ${
                            pathname === item.path
                              ? "text-white font-medium"
                              : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {item.label}
                          <svg
                            className="w-4 h-4 ml-auto inline-block"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </summary>
                        <ul className="pl-4 mt-2 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.path}>
                              <Link
                                href={child.path}
                                target={child.target}
                                rel={child.rel}
                                className={`block p-3 text-base transition-colors ${
                                  pathname === child.path
                                    ? "text-white font-medium"
                                    : "text-gray-400 hover:text-gray-200"
                                }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}