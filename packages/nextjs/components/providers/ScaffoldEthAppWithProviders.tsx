"use client";

import { useEffect, useRef } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { Footer } from "~~/components/layout/Footer";
import { Header } from "~~/components/layout/Header";
import { SupabaseProvider } from "~~/components/providers/SupabaseProvider";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";
import { clearSupabaseTokenCache, getSupabaseAccessToken } from "~~/services/store/token-cache";
import { privyConfig } from "~~/services/web3/privyConfig";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { clearSupabaseAuthCookie } from "~~/utils/actions/auth";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();

  return (
    <>
      <div className={`flex flex-col min-h-screen `}>
        <Header />
        <main className="relative flex flex-col flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  // Warm the Supabase token on login so the user upsert happens immediately
  const AuthWarmup = () => {
    const { authenticated, ready } = usePrivy();
    const warmedRef = useRef(false);
    useEffect(() => {
      if (!ready) return;
      if (authenticated && !warmedRef.current) {
        warmedRef.current = true;
        void getSupabaseAccessToken().catch(() => {
          // swallow; UI can still function and will retry on first Supabase call
        });
      }
      if (!authenticated) {
        warmedRef.current = false;
        clearSupabaseTokenCache();
        // Also clear the server cookie so SSR loses RLS context immediately
        void clearSupabaseAuthCookie();
      }
    }, [authenticated, ready]);
    return null;
  };

  return (
    <PrivyProvider appId={scaffoldConfig.privyProjectId} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          <SupabaseProvider>
            <ProgressBar height="3px" color="#2299dd" options={{ showSpinner: false }} />
            <AuthWarmup />
            <ScaffoldEthApp>{children}</ScaffoldEthApp>
          </SupabaseProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
};
