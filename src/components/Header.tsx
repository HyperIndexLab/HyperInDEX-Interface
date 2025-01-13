'use client';

import { useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import logo from '../assets/img/logo.png';
import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
	const { address } = useAccount();

	// 测试下wagmi是否好用
	useEffect(() => {
		console.log(address);
	}, [address]);

  return (
		<>
			<label className="flex cursor-pointer gap-2 justify-between py-3 px-8 sticky top-0 bg-base-300 h-16 items-center">
				<div className="flex items-center gap-2">
					<Link href="/">
						<Image src={logo} alt="logo" width={60} height={24} />
					</Link>
					{/* <svg
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
					</svg> */}
					<Link href="/">
						<span className="text-sm">Trade</span>
					</Link>
					<Link href="/explore">
						<span className="text-sm">Explore</span>
					</Link>
					<Link href="https://news.hyperindex.trade/">
						<span className="text-sm">News</span>
					</Link>
					<Link href="/activity">
						<span className="text-sm">Gift</span>
					</Link>
				</div>
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
