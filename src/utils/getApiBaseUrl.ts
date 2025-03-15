export const getApiBaseUrl = () => {
  return process.env.NODE_ENV !== 'development' 
    ? 'https://hashkeychain-testnet-explorer.alt.technology'
    : 'https://explorer.hsk.xyz';
}; 

export const getNewApiBaseUrl = () => {
  return process.env.NODE_ENV !== 'development' 
    ? 'https://hashkeychain-testnet-explorer.alt.technology'
    : 'https://hashkey.blockscout.com';
};

export const getMyApiBaseUrl = () => {
  return process.env.NODE_ENV === 'development' 
    ? 'https://api.hyperindex.trade'
    : 'https://api.hyperindex.trade';
};