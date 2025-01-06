/* eslint-disable @next/next/no-img-element */
import React from 'react';

interface SwapContainerProps {
  token1?: string;
  token2?: string;
}

const SwapContainer: React.FC<SwapContainerProps> = ({ token1 = 'ETH', token2 = 'Select token' }) => {
  return (
    <div className="swap-container text-white p-8 w-[500px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button className="btn btn-primary">Swap</button>
          <button className="btn btn-primary">Send</button>
        </div>
        <div className="hover: cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </div>
      </div>
      <div className="swap-box bg-base-100 p-4 rounded-lg">
        <span className="text-lg text-neutral">Sell</span>
        <div className="flex justify-between items-center my-4">
          <input className='bg-base-100 text-4xl w-48 focus:outline-none' placeholder='0'></input>
          <button className='h-8 btn btn-outline btn-primary hover:bg-none group'>
            <img src="https://token-icons.s3.amazonaws.com/eth.png" alt="Settings" className="w-6 h-6" />
            <span className='text-neutral group-hover:text-base-100'>{token1}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg> 
          </button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral text-sm">$ 0</span>
          <span className="text-neutral text-sm">0.014 {token1}</span>
        </div>
      </div>
      <div className="flex justify-center my-1">
        <button className='btn btn-primary'>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </button>
      </div>
      <div className="swap-box bg-base-100 p-4 rounded-lg mb-4 ">
        <span className="text-lg text-neutral">Buy</span>
        <div className="flex justify-between items-center my-4">
          <input className='bg-base-100 text-4xl w-48 focus:outline-none' placeholder='0'></input>
          <button className='h-8 btn btn-outline btn-primary hover:bg-none group'>
            <img src="https://token-icons.s3.amazonaws.com/eth.png" alt="Settings" className="w-6 h-6" />
            <span className='text-neutral group-hover:text-base-100'>{token2}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg> 
          </button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral text-sm">$ 0</span>
          <span className="text-neutral text-sm">0.014 {token2}</span>
        </div>
      </div>
      <div className="flex justify-center">
        <button className="btn btn-primary w-full">Select a token</button>
      </div>
    </div>
  );
};

export default SwapContainer; 