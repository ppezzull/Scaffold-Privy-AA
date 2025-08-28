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
import { useDisconnect } from "wagmi";
import { ArrowLeftOnRectangleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();
  const { logout } = usePrivy();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="destructive" className="gap-1">
          <span>Wrong network</span>
          <ChevronDownIcon className="h-6 w-4 ml-2 sm:ml-0 text-[var(--card-foreground)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mr-2">
        {/* Network switch options */}
        <NetworkOptions onPicked={() => setOpen(false)} />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-error flex gap-3"
          onClick={async () => {
            disconnect();
            await logout();
            setOpen(false);
          }}
        >
          <ArrowLeftOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0 text-[var(--card-foreground)]" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
