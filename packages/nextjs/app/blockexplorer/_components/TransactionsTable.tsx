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
      <div className="overflow-x-auto w-full">
        <div className="rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full table-auto text-sm bg-[var(--card)] text-[var(--card-foreground)]">
            <thead>
              <tr className="text-xs">
                <th className="bg-[var(--color-base-300)] text-[var(--primary-foreground)] px-6 py-3 text-left">
                  Transaction Hash
                </th>
                <th className="bg-[var(--color-base-300)] text-[var(--primary-foreground)] px-6 py-3 text-left">
                  Function Called
                </th>
                <th className="bg-[var(--color-base-300)] text-[var(--primary-foreground)] px-6 py-3 text-left">
                  Block Number
                </th>
                <th className="bg-[var(--color-base-300)] text-[var(--primary-foreground)] px-6 py-3 text-left">
                  Time Mined
                </th>
                <th className="bg-[var(--color-base-300)] text-[var(--primary-foreground)] px-6 py-3 text-left">
                  From
                </th>
                <th className="bg-[var(--color-base-300)] text-[var(--primary-foreground)] px-6 py-3 text-left">To</th>
                <th className="bg-[var(--color-base-300)] text-[var(--primary-foreground)] px-6 py-3 text-right">
                  Value ({targetNetwork.nativeCurrency.symbol})
                </th>
              </tr>
            </thead>
            <tbody>
              {blocks.map(block =>
                (block.transactions as TransactionWithFunction[]).map((tx, idx) => {
                  const receipt = transactionReceipts[tx.hash];
                  const timeMined = new Date(Number(block.timestamp) * 1000).toLocaleString();
                  const functionCalled = tx.input.substring(0, 10);
                  const rowBg = idx % 2 === 0 ? "bg-[var(--color-base-100)]" : "bg-[var(--color-base-300)]";

                  return (
                    <tr key={tx.hash} className={`${rowBg} hover:opacity-95`}>
                      <td className="w-1/12 md:py-6 px-6">
                        <TransactionHash hash={tx.hash} />
                      </td>
                      <td className="w-2/12 md:py-4 px-4">
                        {tx.functionName === "0x" ? "" : <span className="mr-1">{tx.functionName}</span>}
                        {functionCalled !== "0x" && (
                          <Badge variant="primary" size="sm">
                            {functionCalled}
                          </Badge>
                        )}
                      </td>
                      <td className="w-1/12 md:py-6 px-6">{block.number?.toString()}</td>
                      <td className="w-2/12 md:py-6 px-6">{timeMined}</td>
                      <td className="w-2/12 md:py-6 px-6">
                        <Address address={tx.from} size="sm" onlyEnsOrAddress />
                      </td>
                      <td className="w-2/12 md:py-4 px-4">
                        {!receipt?.contractAddress ? (
                          tx.to && <Address address={tx.to} size="sm" onlyEnsOrAddress />
                        ) : (
                          <div className="relative">
                            <Address address={receipt.contractAddress} size="sm" onlyEnsOrAddress />
                            <small className="absolute top-4 left-4">(Contract Creation)</small>
                          </div>
                        )}
                      </td>
                      <td className="text-right md:py-6 px-6">
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
    </div>
  );
};
