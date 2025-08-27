import { useState } from "react";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { NetworkOptions } from "./NetworkOptions";
import { usePrivy } from "@privy-io/react-auth";
import { getAddress } from "viem";
import { Address } from "viem";
import { useDisconnect } from "wagmi";
import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { isENS } from "~~/components/scaffold-eth";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth";
import { getTargetNetworks } from "~~/utils/scaffold-eth";

const allowedNetworks = getTargetNetworks();

type AddressInfoDropdownProps = {
  address: Address;
  blockExplorerAddressLink: string | undefined;
  displayName: string;
};

export const AddressInfoDropdown = ({ address, displayName, blockExplorerAddressLink }: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const { logout } = usePrivy();
  const checkSumAddress = getAddress(address);

  const { copyToClipboard: copyAddressToClipboard, isCopiedToClipboard: isAddressCopiedToClipboard } =
    useCopyToClipboard();
  const [selectingNetwork, setSelectingNetwork] = useState(false);
  const [open, setOpen] = useState(false);
  const closeDropdown = () => setOpen(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="pr-2 gap-0 rounded-full bg-[var(--color-base-300)] text-[var(--card-foreground)] border border-[var(--border)] shadow-sm hover:bg-[var(--color-base-200)]/90 active:scale-[0.98] transition"
        >
          <span className="ml-2 mr-1">
            {isENS(displayName) ? displayName : checkSumAddress?.slice(0, 6) + "..." + checkSumAddress?.slice(-4)}
          </span>
          <ChevronDownIcon className="h-6 w-4 ml-2 sm:ml-0 text-[var(--card-foreground)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-20 p-1 mt-1 rounded-xl bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-lg">
        {allowedNetworks.length > 1 && !selectingNetwork && (
          <DropdownMenuItem
            onSelect={e => {
              e.preventDefault();
              setSelectingNetwork(true);
            }}
            className="flex gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-base-200)]/70"
          >
            <ArrowsRightLeftIcon className="h-6 w-4 ml-2 sm:ml-0 text-[var(--card-foreground)]" />
            <span>Switch Network</span>
          </DropdownMenuItem>
        )}
        <NetworkOptions
          hidden={!selectingNetwork}
          onPicked={() => {
            setSelectingNetwork(false);
            setOpen(false);
          }}
        />
        {!selectingNetwork && (
          <>
            <DropdownMenuItem
              className="flex gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-base-200)]/70"
              onClick={() => copyAddressToClipboard(checkSumAddress)}
            >
              {isAddressCopiedToClipboard ? (
                <>
                  <CheckCircleIcon
                    className="text-xl font-normal h-6 w-4 ml-2 sm:ml-0 text-[var(--card-foreground)]"
                    aria-hidden="true"
                  />
                  <span className="whitespace-nowrap">Copied!</span>
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon
                    className="text-xl font-normal h-6 w-4 ml-2 sm:ml-0 text-[var(--card-foreground)]"
                    aria-hidden="true"
                  />
                  <span className="whitespace-nowrap">Copy address</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem className="flex gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-base-200)]/70" asChild>
              <a
                target="_blank"
                href={blockExplorerAddressLink}
                rel="noopener noreferrer"
                className="whitespace-nowrap"
              >
                <ArrowTopRightOnSquareIcon className="h-6 w-4 ml-2 sm:ml-0 text-[var(--card-foreground)]" />
                View on Block Explorer
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-error flex gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-base-200)]/70"
              onClick={async () => {
                try {
                  disconnect();
                  await logout();
                } finally {
                  closeDropdown();
                }
              }}
            >
              <ArrowLeftOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0 text-[var(--card-foreground)]" />
              <span>Disconnect</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
