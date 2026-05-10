import type { InputHTMLAttributes } from "react";

type InputSize = "sm" | "md";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
  md: "h-10 px-4 bg-surface-secondary border-border",
  sm: "px-3 py-1.5 bg-surface border-primary-200",
};

export default function Input({
  inputSize = "md",
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      className={`border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 transition-all ${sizeClasses[inputSize]} ${className}`}
      {...props}
    />
  );
}
