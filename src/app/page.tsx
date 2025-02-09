'use client';
import SwapContainer from '../components/SwapContainer';
import { useSearchParams } from 'next/navigation';

// 参数
export default function Home() {
  const searchParams = useSearchParams();
  
  // inputCurrency 为token1  传入address地址
  const inputCurrency = searchParams?.get('inputCurrency') ?? undefined;

  // outputCurrency 为token2  传入address地址
  const outputCurrency = searchParams?.get('outputCurrency') ?? undefined;
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-3.5rem)] pt-14">
      <SwapContainer token1={inputCurrency} token2={outputCurrency} />
    </div>
  );
}
