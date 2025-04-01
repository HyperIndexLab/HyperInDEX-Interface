'use client';
import AdPopover from '@/components/Adpopover';
// import SwapContainer from '../components/SwapContainer';
import { useSearchParams } from 'next/navigation';
import Competition from '../assets/img/competition.png';
import SwapContainerV3 from '@/components/SwapContainerV3';

// 参数
export default function Home() {
  const searchParams = useSearchParams();

  // inputCurrency 为token1  传入address地址
  const inputCurrency = searchParams?.get('inputCurrency') ?? undefined;

  // outputCurrency 为token2  传入address地址
  const outputCurrency = searchParams?.get('outputCurrency') ?? undefined;
  return (
    <>
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)] sm:min-h-[calc(100vh-3.5rem)]  pt-14 px-4">
        <SwapContainerV3 token1={inputCurrency} token2={outputCurrency} />
      </div>
      <AdPopover 
        imageUrl={Competition.src}
        linkUrl="https://happy.hyperindex.trade/"
      />
    </>
  );
}
