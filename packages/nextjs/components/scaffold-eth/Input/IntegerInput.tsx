import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { CommonInputProps, InputBase, IntegerVariant, isValidInteger } from "~~/components/scaffold-eth";
import { Tooltip, TooltipContent, TooltipTrigger } from "~~/components/ui/tooltip";

type IntegerInputProps = CommonInputProps<string> & {
  variant?: IntegerVariant;
  disableMultiplyBy1e18?: boolean;
};

export const IntegerInput = ({
  value,
  onChange,
  name,
  placeholder,
  disabled,
  variant = IntegerVariant.UINT256,
  disableMultiplyBy1e18 = false,
}: IntegerInputProps) => {
  const [inputError, setInputError] = useState(false);
  const multiplyBy1e18 = useCallback(() => {
    if (!value) return;
    return onChange(parseEther(value).toString());
  }, [onChange, value]);

  useEffect(() => {
    if (isValidInteger(variant, value)) {
      setInputError(false);
    } else {
      setInputError(true);
    }
  }, [value, variant]);

  return (
    <InputBase
      name={name}
      value={value}
      placeholder={placeholder}
      error={inputError}
      onChange={onChange}
      disabled={disabled}
      suffix={
        !inputError &&
        !disableMultiplyBy1e18 && (
          <div className="flex items-center px-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} font-semibold px-3 text-accent/90 hover:text-accent`}
                  onClick={multiplyBy1e18}
                  disabled={disabled}
                  type="button"
                  aria-label="multiply-by-1e18"
                >
                  ∗
                </button>
              </TooltipTrigger>
              <TooltipContent>Multiply by 1e18 (wei)</TooltipContent>
            </Tooltip>
          </div>
        )
      }
    />
  );
};
