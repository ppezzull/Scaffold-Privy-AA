"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress, isHex } from "viem";
import { hardhat } from "viem/chains";
import { usePublicClient } from "wagmi";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";

export const SearchBar = () => {
  const [searchInput, setSearchInput] = useState("");
  const router = useRouter();

  const client = usePublicClient({ chainId: hardhat.id });

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isHex(searchInput)) {
      try {
        const tx = await client?.getTransaction({ hash: searchInput });
        if (tx) {
          router.push(`/blockexplorer/transaction/${searchInput}`);
          return;
        }
      } catch (error) {
        console.error("Failed to fetch transaction:", error);
      }
    }

    if (isAddress(searchInput)) {
      router.push(`/blockexplorer/address/${searchInput}`);
      return;
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center justify-end mb-5 space-x-3 mx-5">
      <div className="w-full md:w-1/2 lg:w-1/3">
        <Input
          type="text"
          value={searchInput}
          placeholder="Search by hash or address"
          onChange={e => setSearchInput(e.target.value)}
          className={` px-4 py-2 bg-[var(--color-base-100)] text-[var(--card-foreground)] placeholder:text-[var(--card-foreground)] placeholder:opacity-70 shadow-sm border border-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
        />
      </div>
      <Button size="sm" type="submit">
        Search
      </Button>
    </form>
  );
};
