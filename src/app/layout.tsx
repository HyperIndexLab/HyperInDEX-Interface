"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Provider } from 'react-redux';
import { Theme } from 'react-daisyui';
import RainbowKitWrapper from '../components/RainbowKitProvider';
import store from '../store';
import Header from '../components/Header';
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
        <html lang="en">
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <Theme dataTheme="dark">
              <RainbowKitWrapper>
                <Header  />  
                {children}
              </RainbowKitWrapper>
            </Theme>
          </body>
        </html>
    </Provider>
  );
}
