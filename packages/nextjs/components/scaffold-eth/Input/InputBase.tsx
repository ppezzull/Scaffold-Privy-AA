import { ChangeEvent, FocusEvent, ReactNode, useCallback, useEffect, useRef } from "react";
import { CommonInputProps } from "~~/components/scaffold-eth";
import { Input } from "~~/components/ui/input";

type InputBaseProps<T> = CommonInputProps<T> & {
  error?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  reFocus?: boolean;
};

export const InputBase = <T extends { toString: () => string } | undefined = string>({
  name,
  value,
  onChange,
  placeholder,
  error,
  disabled,
  prefix,
  suffix,
  reFocus,
}: InputBaseProps<T>) => {
  const inputReft = useRef<HTMLInputElement>(null);

  // Use semantic tokens instead of DaisyUI utility classes; preserve rounded-full shape
  const wrapperClasses = [
    "flex items-stretch rounded-full border",
    // Use semantic card foreground so typed text follows the theme (white in dark)
    "border-input bg-background text-[var(--card-foreground)]",
    disabled ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value as unknown as T);
    },
    [onChange],
  );

  // Runs only when reFocus prop is passed, useful for setting the cursor
  // at the end of the input. Example AddressInput
  const onFocus = (e: FocusEvent<HTMLInputElement, Element>) => {
    if (reFocus !== undefined) {
      e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
    }
  };
  useEffect(() => {
    if (reFocus !== undefined && reFocus === true) inputReft.current?.focus();
  }, [reFocus]);

  return (
    <div className={wrapperClasses}>
      {prefix}
      <Input
        className="h-[2.2rem] min-h-[2.2rem] rounded-full border-0 focus-visible:ring-[3px] px-4"
        placeholder={placeholder}
        name={name}
        value={value?.toString()}
        onChange={handleChange}
        disabled={disabled}
        autoComplete="off"
        ref={inputReft}
        onFocus={onFocus}
        aria-invalid={error ? true : undefined}
      />
      {suffix}
    </div>
  );
};
