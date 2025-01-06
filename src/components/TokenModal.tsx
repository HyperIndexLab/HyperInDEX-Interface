import React, { useState } from 'react';

interface Token {
  name: string;
  symbol: string;
  price: string;
  balance: string;
  icon: string;
}

const tokens: Token[] = [
  { name: 'USD Coin', symbol: 'USDC', price: '199.92', balance: '200', icon: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694' },
  { name: 'Ethereum', symbol: 'ETH', price: '49.83', balance: '0.01377', icon: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694' },
  // Add more tokens as needed
];

const TokenModal: React.FC = () => {
  const [search, setSearch] = useState('');

  const filteredTokens = tokens.filter(token =>
    token.name.toLowerCase().includes(search.toLowerCase()) ||
    token.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-neutral p-6 rounded-lg w-[400px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg text-neutral-content">选择代币</h2>
          <button className="text-neutral-content" onClick={() => console.log('Close modal')}>
            &times;
          </button>
        </div>
        <input
          type="text"
          placeholder="搜索代币"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 mb-4 bg-base-100 text-neutral-content rounded focus:outline-none"
        />
        <div>
          {filteredTokens.map((token, index) => (
            <div key={index} className="flex justify-between items-center p-2 hover:bg-base-200 rounded">
              <div className="flex items-center">
                <img src={token.icon} alt={token.name} className="w-6 h-6 mr-2" />
                <div>
                  <div className="text-neutral-content">{token.name}</div>
                  <div className="text-sm text-neutral-content">{token.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-neutral-content">US${token.price}</div>
                <div className="text-sm text-neutral-content">{token.balance}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TokenModal; 