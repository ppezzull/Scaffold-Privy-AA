"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "./ui/navigation-menu";
import { hardhat } from "viem/chains";
import { Bars3Icon, BugAntIcon } from "@heroicons/react/24/outline";
import { FaucetButton, PrivyCustomConnectButton } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { cn } from "~~/lib/utils";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
];

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 items-center justify-between px-2 sm:px-4">
        {/* Left: Mobile burger + Logo */}
        <div className="flex items-center gap-2">
          {/* Mobile menu */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Bars3Icon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52">
                {menuLinks.map(({ label, href, icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href} className="flex items-center gap-2">
                      {icon}
                      <span>{label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 ml-1 lg:ml-2 mr-2 shrink-0">
            <div className="relative h-8 w-8">
              <Image alt="SE2 logo" className="cursor-pointer" fill src="/logo.svg" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-bold">Scaffold-ETH</span>
              <span className="text-[10px]">Ethereum dev stack</span>
            </div>
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex flex-1 items-center justify-start">
          <NavigationMenu>
            <NavigationMenuList className="gap-2">
              {menuLinks.map(({ label, href, icon }) => {
                const isActive = pathname === href;
                return (
                  <NavigationMenuItem key={href}>
                    <NavigationMenuLink
                      asChild
                      className={cn("px-3 py-1.5 rounded-full gap-2", isActive && "bg-secondary shadow")}
                    >
                      <Link href={href} className="flex items-center gap-2">
                        {icon}
                        <span className="text-sm">{label}</span>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 mr-2 lg:mr-4">
          <PrivyCustomConnectButton />
          {isLocalNetwork && <FaucetButton />}
        </div>
      </div>
    </header>
  );
};
