"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Provider } from 'react-redux';
import { Theme } from 'react-daisyui';
import RainbowKitWrapper from '../components/RainbowKitProvider';
import store from '../store';
import Header from '../components/Header';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ParticlesBackground from '../components/ParticlesBackground';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Provider store={store}>
      <html lang="en" data-theme="dark">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
          <Theme dataTheme="dark">
            <RainbowKitWrapper>
              <ParticlesBackground />
              <div className="relative z-10">
                <Header />
                <main className="flex-1">
                  {children}
                </main>
              </div>
            </RainbowKitWrapper>
          </Theme>
          <ToastContainer />
        </body>
      </html>
    </Provider>
  );
}
