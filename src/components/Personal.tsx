import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import CopyAddress from './copyAddress';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import Image from 'next/image';
import {  selectTokens } from '@/store/tokenListSlice';
import { useDispatch, useSelector } from 'react-redux';
import TabToken, { TokenTab } from './Personal/TabToken';
import { fetchUserTokens, selectUserTokens } from '@/store/userTokensSlice';
import { AppDispatch } from '@/store';
import { getTokens, Token } from '@/request/explore';
import { formatTokenBalance } from '@/utils/formatTokenBalance';
import TabPool from './Personal/TabPool';
import BigNumber from 'bignumber.js';

export interface TokenBalance {
  address: string;
  balance: string;
}

// 骨架屏组件
const TokenSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {/* 代币项骨架 */}
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.08]" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-white/[0.08] rounded" />
            <div className="h-3 w-16 bg-white/[0.08] rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 bg-white/[0.08] rounded" />
          <div className="h-3 w-12 bg-white/[0.08] rounded" />
        </div>
      </div>
    ))}
  </div>
);

export default function Personal({ isOpen, setOpen }: { isOpen: boolean, setOpen: (open: boolean) => void }) {
  const { address, connector } = useAccount();
	const { disconnect } = useDisconnect();
	const [connectorName, setConnectorName] = useState('');
	const tokens = useSelector(selectTokens);
	const userTokens = useSelector(selectUserTokens);
	const [activeTab, setActiveTab] = useState('token');
	const dispatch = useDispatch<AppDispatch>();
	const [tokenData, setTokenData] = useState<Token[]>([]);
	const [totalBalance, setTotalBalance] = useState<string>('0');
	const [tokenBalances, setTokenBalances] = useState<TokenTab[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const logout = () => {
		disconnect();
		setOpen(false);
	}

	useEffect(() => {
    if (address && userTokens.length === 0) {
      setIsLoading(true);
      dispatch(fetchUserTokens(address));
    }
  }, [address, dispatch, tokens.length, userTokens.length]);

	// connector?.name 需要转换
	useEffect(() => {
		if (connector?.name) {
			const name = connector?.name.toLowerCase();
			if (name === 'metamask') {
				setConnectorName('metamask');
			} else if (name === 'okx wallet') {
				setConnectorName('okx');
			} else if (name === 'particle wallet') {
				setConnectorName('particle');
			} else {
				setConnectorName(name);
			}
		}
	}, [connector?.name]);


	useEffect(() => {
	 // 根据userTokens 和 
		if (tokenData.length === 0) {
			fetchTokens()
		}
	 
	}, [tokenData.length, userTokens])

	const fetchTokens = async () => {
    try {
			const tokens = await getTokens()
			setTokenData(tokens)
    } catch (error) {
      console.error('Failed to fetch token list:', error)
    }
  }

	useEffect(() => {
		if (tokenData.length > 0 && userTokens.length > 0) {
			// 根据tokenData 和 userTokens 计算总额
			let totalBalance = BigNumber(0);

			userTokens.forEach(token => {
				const balance = formatTokenBalance(token.value, token.token.decimals);

				const tokenBalance = tokenData.find(t => t.address === token.token.address);
			
				if (tokenBalance) {
					const price = parseFloat(tokenBalance.price.replace('$', ''));
					totalBalance = BigNumber(totalBalance).plus(BigNumber(balance).multipliedBy(price));
					
				}

				totalBalance = BigNumber(totalBalance).plus(parseFloat(balance));
			});
			setTotalBalance(totalBalance.toString());

			setTokenBalances(userTokens.map(token => ({
				...token,
				price: tokenData.find(t => t.address === token.token.address)?.price.replace('$', '') || '0'
			})))
			setIsLoading(false);
		}
	}, [setTotalBalance, tokenData, tokenData.length, userTokens, userTokens.length])

  return (
    <>
      {/* 侧边栏遮罩 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 收起按钮 - 固定在抽屉外部左侧 */}
      <div className={`fixed top-4 right-[360px] z-50 transition-all duration-300 ${
        isOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}>
        <button 
          className="btn btn-sm btn-circle bg-[#0D111C] hover:bg-[#0D111C] border border-white/[0.08]"
          onClick={() => setOpen(false)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 6l6 6-6 6M5 6l6 6-6 6"/>
          </svg>
        </button>
      </div>

      {/* 侧边栏内容 */}
      <div className={`fixed top-0 right-0 h-screen w-[360px] bg-[#0D111C] z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col w-full px-2 h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Jazzicon diameter={32} seed={jsNumberForAddress(address || '')} />
                <Image 
                  className="absolute -bottom-1 -right-1 rounded-full" 
                  src={`/img/${connectorName}.png`} 
                  alt="wallet" 
                  width={14} 
                  height={14} 
                />
              </div>
              {address && <CopyAddress address={address} />}
            </div>
            <button 
              className="btn btn-ghost btn-sm btn-circle"
              onClick={logout}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 7.3335C7.63133 7.3335 7.33333 7.03483 7.33333 6.66683V2.00016C7.33333 1.63216 7.63133 1.3335 8 1.3335C8.36867 1.3335 8.66667 1.63216 8.66667 2.00016V6.66683C8.66667 7.03483 8.36867 7.3335 8 7.3335ZM14 8.66683C14 6.5375 12.8506 4.5462 11.002 3.47087C10.6833 3.28553 10.2753 3.39343 10.0907 3.71143C9.90532 4.03009 10.0134 4.43822 10.3314 4.62288C11.772 5.46088 12.6667 7.01083 12.6667 8.66683C12.6667 11.2402 10.5727 13.3335 8 13.3335C5.42733 13.3335 3.33333 11.2402 3.33333 8.66683C3.33333 7.01083 4.22795 5.46088 5.66862 4.62288C5.98729 4.43822 6.09534 4.02943 5.90934 3.71143C5.72334 3.39343 5.31538 3.2842 4.99805 3.47087C3.14938 4.54687 2 6.5375 2 8.66683C2 11.9748 4.69133 14.6668 8 14.6668C11.3087 14.6668 14 11.9748 14 8.66683Z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          {/* 总资产 */}
          <div className="px-6 py-4">
            <div className="text-sm font-medium text-gray-400 mb-1">Total Balance</div>
            {isLoading ? (
              <div className="h-8 w-48 bg-white/[0.08] rounded animate-pulse" />
            ) : (
              <div className="text-[32px] font-medium tracking-[-0.02em]">${totalBalance}</div>
            )}
          </div>

          {/* 导航切换 */}
          <div className="flex px-6 border-b border-white/[0.08]">
            <button
              className={`py-4 px-1 text-base font-medium relative ${
                activeTab === 'token' 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('token')}
            >
              Tokens
              {activeTab === 'token' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
              )}
            </button>
            <button
              className={`py-4 px-1 text-base font-medium ml-6 relative ${
                activeTab === 'pool' 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('pool')}
            >
              Pools
              {activeTab === 'pool' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
              )}
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto px-2 py-4">
            {isLoading ? (
              <TokenSkeleton />
            ) : (
              <>
                {activeTab === 'token' && <TabToken userTokens={tokenBalances} />}
                {activeTab === 'pool' && <TabPool tokenData={tokenData} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
