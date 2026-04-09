import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "success" | "warning" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 shadow-button hover:shadow-md",
  success:
    "bg-success-600 text-white hover:bg-success-700 shadow-button hover:shadow-md",
  warning:
    "bg-warning-50 text-warning-600 hover:bg-warning-100 border border-warning-100",
  danger:
    "bg-danger-50 text-danger-600 hover:bg-danger-100 border border-danger-100",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-tertiary border border-border",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
