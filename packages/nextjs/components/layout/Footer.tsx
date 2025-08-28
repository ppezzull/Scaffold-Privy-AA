import React from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { hardhat } from "viem/chains";
import { CurrencyDollarIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/outline";
import { BuidlGuidlLogo } from "~~/components/assets/BuidlGuidlLogo";
import { SwitchTheme } from "~~/components/ui/switch-theme";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";

/**
 * Site footer
 */
export const Footer = () => {
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-2 pointer-events-auto">
            {nativeCurrencyPrice > 0 && (
              <div>
                <Button size="sm" className="font-normal gap-1 cursor-auto" disabled>
                  <CurrencyDollarIcon className="h-4 w-4" />
                  <span>{nativeCurrencyPrice.toFixed(2)}</span>
                </Button>
              </div>
            )}
            {isLocalNetwork && (
              <>
                <Button asChild size="sm" className="font-normal gap-1">
                  <Link href="/blockexplorer" passHref>
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    <span>Block Explorer</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
          <SwitchTheme className={`pointer-events-auto ${isLocalNetwork ? "self-end md:self-auto" : ""}`} />
        </div>
      </div>
      <div className="w-full">
        <nav className="flex justify-center items-center gap-2 text-sm w-full py-2 text-foreground">
          <div className="text-center">
            <a
              href="https://github.com/ppezzull/Scaffold-Privy-AA"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              Fork me
            </a>
          </div>
          <span>·</span>
          <div className="flex justify-center items-center gap-2">
            <p className="m-0 text-center">
              Built with <HeartIcon className="inline-block h-4 w-4" /> at
            </p>
            <a
              className="flex justify-center items-center gap-1 underline underline-offset-2 hover:opacity-80"
              href="https://buidlguidl.com/"
              target="_blank"
              rel="noreferrer"
            >
              <BuidlGuidlLogo className="w-3 h-5 pb-1" />
              <span>BuidlGuidl</span>
            </a>
          </div>
          <span>·</span>
          <div className="text-center">
            <a
              href="https://t.me/ppezzu"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              Support
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
};
