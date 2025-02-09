// 设计成一个从右边弹出的侧边栏加个动画，参考uniswap的侧边栏
import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

export default function Personal({ isOpen, setOpen }: { isOpen: boolean, setOpen: (open: boolean) => void }) {
  const { address, connector, isConnected } = useAccount();
	const { disconnect } = useDisconnect();

	console.log(connector?.name, isConnected, address);
  return (
    <div className={`fixed top-0 right-0 h-screen transition-all duration-300  ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
			<button onClick={() => setOpen(false)}>X</button>
      <div className="p-4 w-80 bg-base-100">
				<div>
					<div>
						<p>Address</p>
						<p>{address}</p>
					</div>
					<div>
						<p>Connector</p>
						<p>{connector?.name}</p>
					</div>
				</div>
				<button onClick={() => disconnect()}>Disconnect</button>
      </div>
    </div>
  );
}