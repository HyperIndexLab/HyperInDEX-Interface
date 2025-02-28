import React from 'react';

import { UserToken } from '@/store/userTokensSlice';
import { formatTokenBalance } from '@/utils/formatTokenBalance';
import BigNumber from 'bignumber.js';
import { DEFAULT_TOKEN_ICON } from '../TokenModal';

export interface TokenTab extends UserToken {
	price: string;
}

export default function TabToken({userTokens}: {userTokens: TokenTab[] }) {
	return (
		<div className="mt-4 px-2">
			{userTokens?.map((token) => {
				// 特殊处理HSK代币价格，使其与WHSK价格一致
				const tokenPrice = token.token.symbol === 'HSK' ? 
					userTokens.find(t => t.token.symbol === 'WHSK')?.price || token.price : 
					token.price;

				return (
					<div key={token.token.address} className="flex items-center gap-2 mb-2 justify-between">
						<div className="flex items-center gap-2">
							<img src={token.token.icon_url || DEFAULT_TOKEN_ICON}  alt={token.token.name!} className="w-8 h-8 rounded-full" />
							<div className="flex flex-col">
								<span>{token.token.name}</span>
								<div className="flex">
									<span className="text-xs text-base-content/60 mr-1">
									{	formatTokenBalance(token.value, token.token.decimals)}
									</span>
									<span className="text-xs text-base-content/60">{token.token.symbol}</span>
								</div>
							</div>
						</div>
						<div className="text-base">
							{tokenPrice === '0' ?  BigNumber(formatTokenBalance(token.value, token.token.decimals)).toString() : `$${BigNumber(tokenPrice).multipliedBy(BigNumber(formatTokenBalance(token.value, token.token.decimals))).toString()}`}
						</div>
					</div>
				)
			})}
		</div>
	)
}
