import { useAccount, useSwitchChain } from "wagmi";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/solid";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

export const NetworkSwitcher = () => {
  const { address, isConnected, chain } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { switchChain } = useSwitchChain();
  const requiredChainId = targetNetwork?.id ?? Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

  // When connected but on a different chain, prompt to switch to the required chain
  if (isConnected && chain?.id !== requiredChainId) {
    return (
      <div className="fixed top-3 left-0 right-0 z-50 flex justify-center">
        <div className="max-w-4xl mx-4 px-4 py-2 rounded-md bg-amber-600 text-black border border-amber-800 shadow-md flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-start">
              <div className="text-lg font-semibold">Please switch networks</div>
              <div className="text-sm text-black/80">
                <span className="font-mono">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}</span>
                <span> is connected to wrong network</span>.
              </div>
              <div className="mt-1 text-sm">
                This app requires
                <span className="font-semibold"> {targetNetwork?.name || `chain ${requiredChainId}`}</span>.
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {switchChain && targetNetwork ? (
              <button
                className="px-4 py-1 rounded bg-amber-900 text-white font-semibold text-sm hover:opacity-95 flex items-center gap-2"
                onClick={() => switchChain({ chainId: targetNetwork.id })}
                type="button"
              >
                <ArrowsRightLeftIcon className="h-5 w-5" />
                <span>Switch to {targetNetwork.name}</span>
              </button>
            ) : (
              <div className="text-sm">
                No automatic switch available for your connector. Please open your wallet and switch to{" "}
                <span className="font-semibold">{targetNetwork?.name || `chain ${requiredChainId}`}</span>.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
