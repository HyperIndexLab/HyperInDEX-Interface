'use client';

import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import logo from '../assets/img/logo.png';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MENU_MAP = [
	{path: '/', label: 'Trade'}, 
	{path: '/explore', label: 'Explore', children: [
		{path: '/explore/tokens', label: 'Token'},
		{path: '/explore/pools', label: 'Pool'},
	]},
	{path: '/news', label: 'News'},
	{path: '/activity', label: 'Activity', children: [
		{path: '/activity', label: 'Gift🎁'},
	]},
]

export default function Header() {
	const { address } = useAccount();
	const pathname = usePathname();
	// 有多个菜单开关
	const [menuOpenMap, setMenuOpenMap] = useState<{ [key: string]: boolean }>({});

	const handleMenuEnter = (menu: string) => {
		setMenuOpenMap((prev) => ({ ...prev, [menu]: true }));
	};

	const handleMenuLeave = (menu: string) => {
		setMenuOpenMap((prev) => ({ ...prev, [menu]: false }));
	};

	// 测试下wagmi是否好用
	useEffect(() => {
		console.log(address);
	}, [address]);

  return (
		<>
			<div className="flex gap-2 justify-between py-3 px-8 sticky top-0 bg-base-300 h-16 items-center">
				<div className="flex items-center gap-6">
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
					{MENU_MAP.map((item) => (
						<Link key={item.path} href={item.path} className='h-[40px] leading-[45px] relative' onMouseEnter={() => handleMenuEnter(item.label)} onMouseLeave={() => handleMenuLeave(item.label)}>
							<span className={`text-base ${pathname === item.path ? '' : 'text-neutral'}`}>
								{item.label}
							</span>
							{
								item.children && menuOpenMap[item.label] && <ul className="menu bg-base-200 rounded-box absolute top-10" style={{ right: '50%', transform: 'translateX(50%)' }}>
									{item.children.map((child) => (
										<li key={child.path}><Link href={child.path} className={`w-[140px] ${pathname === child.path ? 'text-primary' : ''}`}>{child.label}</Link></li>
									))}
								</ul>
							}
						</Link>
					))}
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
			</div>
		</>
  );
}
