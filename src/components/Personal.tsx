import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import CopyAddress from './copyAddress';
import jazzicon from 'jazzicon';
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
import TabActivity from './Personal/TabActivity';
export interface TokenBalance {
	address: string;
	balance: string;
}

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

	console.log(userTokens, "userTokens===111")

	const logout = () => {
		disconnect();
		setOpen(false);
	}

	useEffect(() => {
    if (address) {
      const icon = jazzicon(32, parseInt(address.slice(2, 10), 16)); // 生成32px的图标
      const iconContainer = document.getElementById('jazzicon');
      if (iconContainer) {
        iconContainer.innerHTML = '';
        iconContainer.appendChild(icon);
      }
    }
  }, [address]); 

	useEffect(() => {
    if (address && userTokens.length === 0) {
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
		}
	}, [setTotalBalance, tokenData, tokenData.length, userTokens, userTokens.length])

  return (
    <div className={`flex flex-col fixed top-0 right-0 h-screen transition-all duration-300 bg-base-300 border-l border-base-200 shadow-lg p-2  ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
			<button className="absolute top-[16px] right-[10px] btn btn-ghost btn-circle text-lg" onClick={() => setOpen(false)}>X</button>
      <div className="p-4 w-80 bg-base-300">
				<div className="flex  bg-base-300">
					<div className="mr-2 relative">
						<div id="jazzicon"></div>
						<Image className="absolute bottom-1 right-[-4px] rounded-full" src={`/img/${connectorName}.png`} alt="avatar" width={14} height={14} />
					</div>
					<div className="mt-[6px]">
						{address && <CopyAddress address={address} />}
					</div>
					<button className="btn btn-ghost btn-circle btn-sm ml-2" onClick={logout}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M8 7.3335C7.63133 7.3335 7.33333 7.03483 7.33333 6.66683V2.00016C7.33333 1.63216 7.63133 1.3335 8 1.3335C8.36867 1.3335 8.66667 1.63216 8.66667 2.00016V6.66683C8.66667 7.03483 8.36867 7.3335 8 7.3335ZM14 8.66683C14 6.5375 12.8506 4.5462 11.002 3.47087C10.6833 3.28553 10.2753 3.39343 10.0907 3.71143C9.90532 4.03009 10.0134 4.43822 10.3314 4.62288C11.772 5.46088 12.6667 7.01083 12.6667 8.66683C12.6667 11.2402 10.5727 13.3335 8 13.3335C5.42733 13.3335 3.33333 11.2402 3.33333 8.66683C3.33333 7.01083 4.22795 5.46088 5.66862 4.62288C5.98729 4.43822 6.09534 4.02943 5.90934 3.71143C5.72334 3.39343 5.31538 3.2842 4.99805 3.47087C3.14938 4.54687 2 6.5375 2 8.66683C2 11.9748 4.69133 14.6668 8 14.6668C11.3087 14.6668 14 11.9748 14 8.66683Z" fill="currentColor"></path>
						</svg>
					</button>
				</div>
      </div>
			<div className="text-4xl font-bold mb-6">
				${totalBalance}
			</div>
			<div role="tablist" className="tabs tabs-boxed w-full">
				<a role="tab" className={`tab ${activeTab === 'token' ? 'tab-active' : ''}`} onClick={() => setActiveTab('token')}>Tokens</a>
				<a role="tab" className={`tab ${activeTab === 'pool' ? 'tab-active' : ''}`} onClick={() => setActiveTab('pool')}>Pools</a>
				<a role="tab" className={`tab ${activeTab === 'activity' ? 'tab-active' : ''}`} onClick={() => setActiveTab('activity')}>Activity</a>
			</div>
			<div className="transition-all duration-300 overflow-y-auto h-[calc(100vh-100px)] w-full">
					{activeTab === 'token' && <TabToken  userTokens={tokenBalances}/>}
					{activeTab === 'pool' && <TabPool tokenData={tokenData}/>}
					{activeTab === 'activity' && <TabActivity />}
				</div>
    </div>
  );
}
