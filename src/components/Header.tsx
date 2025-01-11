'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export default function Header() {
	const isConnected = useAccount();
  return (
		<>
			<label className="flex cursor-pointer gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round">
					<circle cx="12" cy="12" r="5" />
					<path
						d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
				</svg>
				<input type="checkbox" value="synthwave" className="toggle theme-controller" />
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
				</svg>
				
					<ConnectButton.Custom>
						{({ openConnectModal, account, chain, authenticationStatus, openAccountModal, mounted }) => {
							 const ready = mounted && authenticationStatus !== 'loading';
							 const connected =
								 ready &&
								 account &&
								 chain &&
								 (!authenticationStatus ||
									 authenticationStatus === 'authenticated');

							if (ready) {
								if (!connected) {
									return (
									
										<button
											onClick={openConnectModal}
										className="btn btn-primary btn-sm"
									>
										Connect Wallet
									</button>)
								}
	
								return (
									<button
										className="btn btn-primary btn-sm"
										onClick={() => {
											openAccountModal();
										}}
										type="button"
									>
										{account.displayName}
									</button>
								)
							}
						
							return (
								<div>
									Loading...
								</div>
							)
						}}
					</ConnectButton.Custom>
				
				
			</label>
		</>
  );
}
