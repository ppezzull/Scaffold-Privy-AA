import { formatEther } from "viem";
import { TransactionHash } from "~~/app/blockexplorer/_components";
import { Address } from "~~/components/scaffold-eth";
import { Badge } from "~~/components/ui/badge";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { TransactionWithFunction, TransactionsTableProps } from "~~/utils/scaffold-eth";

export const TransactionsTable = ({ blocks, transactionReceipts }: TransactionsTableProps) => {
  const { targetNetwork } = useTargetNetwork();

  return (
    <div className="flex justify-center px-4 md:px-0">
      <div className="overflow-x-auto w-full rounded-xl shadow-2xl">
        <table className="w-full table-auto text-sm bg-card text-card-foreground">
          <thead>
            <tr className="rounded-xl text-xs">
              <th className="bg-primary/80 text-primary-foreground px-3 py-2 text-left">Transaction Hash</th>
              <th className="bg-primary/80 text-primary-foreground px-3 py-2 text-left">Function Called</th>
              <th className="bg-primary/80 text-primary-foreground px-3 py-2 text-left">Block Number</th>
              <th className="bg-primary/80 text-primary-foreground px-3 py-2 text-left">Time Mined</th>
              <th className="bg-primary/80 text-primary-foreground px-3 py-2 text-left">From</th>
              <th className="bg-primary/80 text-primary-foreground px-3 py-2 text-left">To</th>
              <th className="bg-primary/80 text-primary-foreground px-3 py-2 text-right">
                Value ({targetNetwork.nativeCurrency.symbol})
              </th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-[color-mix(in_oklab,var(--card),var(--foreground)_5%)]">
            {blocks.map(block =>
              (block.transactions as TransactionWithFunction[]).map(tx => {
                const receipt = transactionReceipts[tx.hash];
                const timeMined = new Date(Number(block.timestamp) * 1000).toLocaleString();
                const functionCalled = tx.input.substring(0, 10);

                return (
                  <tr key={tx.hash} className="hover:bg-[color-mix(in_oklab,var(--card),var(--foreground)_5%)]">
                    <td className="w-1/12 md:py-3 px-3">
                      <TransactionHash hash={tx.hash} />
                    </td>
                    <td className="w-2/12 md:py-3 px-3">
                      {tx.functionName === "0x" ? "" : <span className="mr-1">{tx.functionName}</span>}
                      {functionCalled !== "0x" && (
                        <Badge variant="primary" size="sm">
                          {functionCalled}
                        </Badge>
                      )}
                    </td>
                    <td className="w-1/12 md:py-3 px-3">{block.number?.toString()}</td>
                    <td className="w-2/12 md:py-3 px-3">{timeMined}</td>
                    <td className="w-2/12 md:py-3 px-3">
                      <Address address={tx.from} size="sm" onlyEnsOrAddress />
                    </td>
                    <td className="w-2/12 md:py-3 px-3">
                      {!receipt?.contractAddress ? (
                        tx.to && <Address address={tx.to} size="sm" onlyEnsOrAddress />
                      ) : (
                        <div className="relative">
                          <Address address={receipt.contractAddress} size="sm" onlyEnsOrAddress />
                          <small className="absolute top-4 left-4">(Contract Creation)</small>
                        </div>
                      )}
                    </td>
                    <td className="text-right md:py-3 px-3">
                      {formatEther(tx.value)} {targetNetwork.nativeCurrency.symbol}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
