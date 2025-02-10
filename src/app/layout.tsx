"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Provider } from 'react-redux';
import { AuthCoreContextProvider } from '@particle-network/auth-core-modal';
import { Theme } from 'react-daisyui';
import RainbowKitWrapper from '../components/RainbowKitProvider';
import store from '../store';
import Header from '../components/Header';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
          <AuthCoreContextProvider
              options={{
                  projectId: '34c6b829-5b89-44e8-90a9-6d982787b9c9',
                  clientKey: 'c6Z44Ml4TQeNhctvwYgdSv6DBzfjf6t6CB0JDscR',
                  appId: 'ded98dfe-71f9-4af7-846d-5d8c714d63b0',
                  customStyle: {
                      zIndex: 2147483650, // must greater than 2147483646
                  },
              }}
          >
              <RainbowKitWrapper>
              <div className="min-h-screen flex flex-col bg-base-300">
                <Header />
                <main className="flex-1">
                  {children}
                </main>
              </div>
            </RainbowKitWrapper>
          </AuthCoreContextProvider>
          </Theme>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </body>
      </html>
    </Provider>
  );
}
