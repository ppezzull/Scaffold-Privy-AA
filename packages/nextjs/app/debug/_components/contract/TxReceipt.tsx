import { TransactionReceipt } from "viem";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { ObjectFieldDisplay } from "~~/app/debug/_components/contract";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~~/components/ui/accordion";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth/useCopyToClipboard";
import { replacer } from "~~/utils/scaffold-eth/common";

export const TxReceipt = ({ txResult }: { txResult: TransactionReceipt }) => {
  const { copyToClipboard: copyTxResultToClipboard, isCopiedToClipboard: isTxResultCopiedToClipboard } =
    useCopyToClipboard();

  return (
    <div className="flex text-sm rounded-3xl min-h-0 py-0">
      <div className="mt-1 pl-2">
        {isTxResultCopiedToClipboard ? (
          <CheckCircleIcon
            className="ml-1.5 text-xl font-normal text-foreground h-5 w-5 cursor-pointer"
            aria-hidden="true"
          />
        ) : (
          <DocumentDuplicateIcon
            className="ml-1.5 text-xl font-normal h-5 w-5 cursor-pointer"
            aria-hidden="true"
            onClick={() => copyTxResultToClipboard(JSON.stringify(txResult, replacer, 2))}
          />
        )}
      </div>
      <Accordion className="w-full">
        <AccordionItem className="rounded-3xl">
          <AccordionTrigger className="text-sm py-1.5 pl-1">
            <strong>Transaction Receipt</strong>
          </AccordionTrigger>
          <AccordionContent className="overflow-auto rounded-t-none rounded-3xl pl-0">
            <pre className="text-xs">
              {Object.entries(txResult).map(([k, v]) => (
                <ObjectFieldDisplay name={k} value={v} size="xs" leftPad={false} key={k} />
              ))}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
