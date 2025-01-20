'use client'

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { getActivityStatus, claimActivity, IStatus } from "@/request/activity"
import Link from "next/link"
import { getEtherscanLink } from "@/utils"
import { useChainId } from 'wagmi'
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline"


export default function ActiveTaskModal() {
	const [showPopup, setShowPopup] = useState(false)
  const [status, setStatus] = useState<IStatus | null>(null)
	const { address } = useAccount()
  const [isClaiming, setIsClaiming] = useState(false)
  const chainId = useChainId()

  useEffect(() => {
    if (!address) return
    getActivityStatus(address).then(res => {
      setStatus(res)
    })
  }, [address])

  const handleClaim = () => {
		if (!address) return
    setIsClaiming(true)
    claimActivity(address).then(res => {
      setStatus(res.data)
      setIsClaiming(false)
      if (res.message.data.is_claim_success) {
        // 检查是否成功
        setShowPopup(true) // 显示弹出框
      }
    })
  }

  const handleGotoBridge = (url: string) => {
    window.open(url, '_blank')
  }

 
	return (
    <div className='flex flex-col w-full p-4 bg-background rounded-lg shadow-md mb-4 max-w-[800px]'>
			{!address ?  <>
				<h2 className='text-2xl font-bold my-4'>Complete the task and earn HSK tokens! 🎉</h2>
				<div className='text-lg'>Please connect your wallet first</div>
			</> :
			<>
      <h2 className='text-2xl font-bold my-4'>Complete the task and earn HSK tokens! 🎉</h2>
      <div className='text-lg'>users need to first connect via the Bridge platform, then claim their HSK tokens.</div>
      <h3 className='text-xl font-bold my-4'>Task Flow</h3>
      <div className={`flex justify-between items-center gap-2 mt-3 rounded-lg shadow-md p-4 bg-base-300`}>
        <span className='text-sm'>Task 1:Bridge</span>
        {status?.is_bridge ? (
          <div className='w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-white text-sm font-bold'>✓</div>
        ) : (
          <>
            <div
							className='text-sm btn btn-primary btn-sm'
              onClick={() =>
                handleGotoBridge('https://www.orbiter.finance/en?src_chain=42161&tgt_chain=177&src_token=ETH')
              }
            >
              Go to Orbiter
            </div>
            <div 
							className='text-sm btn btn-primary btn-sm'
              onClick={() => handleGotoBridge('https://owlto.finance/')}
            >
              Go to Owlto
            </div>
          </>
        )}
      </div>
			
			<div className={`flex justify-between items-center gap-2 mt-3 rounded-lg shadow-md p-4 bg-base-300 ${status?.is_bridge ? '' : 'opacity-50'}`}>
				<span className='text-sm'>Task 2:Get Rewarded</span>
				{status?.is_claim_success ? (
          <div className='w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold'>✓</div>
        ) : (
          <button className='text-sm btn btn-primary btn-sm' disabled={isClaiming || !status?.is_bridge} onClick={handleClaim}>
						{isClaiming ? 'Claiming...' : 'Claim'}
					</button>
        )}
			</div>
    
      {showPopup && status?.txHash &&  (
        <div className='flex w-full p-4 mt-4 bg-background rounded-lg shadow-md mb-4 max-w-[800px]'>
          <div style={{ paddingRight: 16 }}>
            {!status?.is_claim_success ? <CheckCircleIcon className='text-green-500 size-6' /> : <ExclamationCircleIcon className='text-red-500 size-6'  />}
          </div>
          <div className='flex flex-col gap-2'>
            <div className='font-bold'>{status?.txHash ?? 'Hash: ' + status?.txHash?.slice(0, 8) + '...' + status?.txHash?.slice(58, 65)}</div>
            <Link className='text-primary' target='_blank' href={getEtherscanLink(chainId, status?.txHash ?? '', 'transaction')}>View on HashKey Chain Scan</Link>
          </div>
        </div>
      )}
			</>
			}
    </div>
  )
}