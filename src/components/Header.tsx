'use client';

import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import logo from '../assets/img/logo.png';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MENU_MAP = [
	{
		path: '/', 
		label: 'Trade',
		icon: (
			<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
			</svg>
		)
	}, 
	{
		path: '/explore', 
		label: 'Explore',
		icon: (
			<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
			</svg>
		),
		children: [
			{
				path: '/explore/tokens', 
				label: 'Tokens',
				icon: (
					<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				)
			},
			{
				path: '/explore/pools', 
				label: 'Pools',
				icon: (
					<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				)
			}
		]
	},
	{
		path: '/news', 
		label: 'News',
		icon: (
			<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
			</svg>
		)
	},
	{
		path: '/activity', 
		label: 'Activity',
		icon: (
			<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
			</svg>
		),
		children: [
			{
				path: '/activity', 
				label: 'Gift 🎁',
				icon: (
					<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
					</svg>
				)
			}
		]
	}
];

export default function Header() {
	const { address } = useAccount();
	const pathname = usePathname();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// 测试下wagmi是否好用
	useEffect(() => {
		console.log(address);
	}, [address]);

	return (
		<div className="w-full fixed top-0 z-50 border-b border-base-200">
			<div className="navbar h-14 max-w-[1200px] mx-auto px-4">
				{/* Logo 部分 */}
				<div className="flex-1">
					<Link href="/" className="flex items-center">
						<Image src={logo} alt="logo" width={60} height={24} />
					</Link>
				</div>

				{/* 菜单部分 */}
				<div className="flex-none hidden lg:block">
					<ul className="menu menu-horizontal gap-1">
						{MENU_MAP.map((item) => (
							<li key={item.path}>
								{!item.children ? (
									<Link 
										href={item.path}
										className={`rounded-lg px-3 hover:bg-base-200 transition-colors ${
											pathname === item.path ? 'bg-primary/10 text-primary' : ''
										}`}
									>
										<span className="flex items-center gap-2">
											{item.icon}
											{item.label}
										</span>
									</Link>
								) : (
									<details className="dropdown dropdown-end" onClick={(e) => {
										// 如果点击的是链接，则关闭下拉菜单
										if ((e.target as HTMLElement).tagName === 'A') {
											(e.currentTarget as HTMLDetailsElement).removeAttribute('open');
										}
									}}>
										<summary className={`rounded-lg px-3 hover:bg-base-200 transition-colors ${
											pathname === item.path ? 'bg-primary/10 text-primary' : ''
										}`}>
											<span className="flex items-center gap-2">
												{item.icon}
												{item.label}
											</span>
										</summary>
										<ul className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-48 mt-2">
											{item.children.map((child) => (
												<li key={child.path}>
													<Link 
														href={child.path}
														className={`${pathname === child.path ? 'active' : ''}`}
													>
														{child.icon}
														{child.label}
													</Link>
												</li>
											))}
										</ul>
									</details>
								)}
							</li>
						))}
					</ul>
				</div>

				{/* 钱包按钮 */}
				<div className="flex-none flex items-center gap-4 ml-4">
					<div className="lg:hidden">
						<label htmlFor="my-drawer" className="btn btn-ghost btn-sm btn-circle">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</label>
					</div>
					<ConnectButton.Custom>
						{({ openConnectModal, account, chain }) => {
							if (!account || !chain) {
								return (
									<button onClick={openConnectModal} className="btn btn-primary btn-sm font-normal">
										Connect Wallet
									</button>
								);
							}
							return (
								<button onClick={openConnectModal} className="btn btn-primary btn-sm font-normal">
									{account.displayName}
								</button>
							);
						}}
					</ConnectButton.Custom>
				</div>
			</div>

			{/* Mobile Drawer */}
			<div className="drawer">
				<input id="my-drawer" type="checkbox" className="drawer-toggle" 
					checked={isMobileMenuOpen}
					onChange={(e) => setIsMobileMenuOpen(e.target.checked)}
				/>
				<div className="drawer-side z-[100]">
					<label htmlFor="my-drawer" className="drawer-overlay"></label>
					<div className="w-full max-w-[320px] min-h-screen bg-base-200 text-base-content">
						{/* 关闭按钮 */}
						<div className="sticky top-0 flex justify-between items-center p-4 border-b border-base-300 bg-base-200">
							<span className="text-lg font-medium">Menu</span>
							<button 
								className="btn btn-ghost btn-circle" 
								onClick={() => setIsMobileMenuOpen(false)}
							>
							</button>
						</div>

						{/* 菜单列表 */}
						<div className="p-4">
							<ul className="space-y-2">
								{MENU_MAP.map((item) => (
									<li key={item.path}>
										{!item.children ? (
											<Link 
												href={item.path}
												className={`flex items-center gap-3 p-3 text-base rounded-lg hover:bg-base-300 ${
													pathname === item.path ? 'bg-primary/10 text-primary' : ''
												}`}
												onClick={() => setIsMobileMenuOpen(false)}
											>
												{item.icon}
												<span>{item.label}</span>
											</Link>
										) : (
											<details className="group">
												<summary className={`w-full flex items-center gap-3 p-3 text-base rounded-lg hover:bg-base-300 marker:content-none ${
													pathname === item.path ? 'bg-primary/10 text-primary' : ''
												}`}>
													{item.icon}
													<span>{item.label}</span>
													<svg 
													className="w-4 h-4 ml-auto" 
													fill="none" 
													viewBox="0 0 24 24" 
													stroke="currentColor"
												>
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
												</svg>
												</summary>
												<ul className="pl-4 mt-2 space-y-1">
													{item.children.map((child) => (
														<li key={child.path}>
															<Link
																href={child.path}
																className={`flex items-center gap-3 p-3 text-base rounded-lg hover:bg-base-300 ${
																	pathname === child.path ? 'bg-primary/10 text-primary' : ''
																}`}
																onClick={() => setIsMobileMenuOpen(false)}
															>
																{child.icon}
																<span>{child.label}</span>
															</Link>
														</li>
													))}
												</ul>
											</details>
										)}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
