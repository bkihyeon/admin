import { AlertTriangle } from "lucide-react";

interface AlertProps {
  children: React.ReactNode;
}

export default function Alert({ children }: AlertProps) {
  return (
    <div className="flex items-start gap-3 bg-warning-50 border-l-4 border-warning-500 rounded-r-lg p-4">
      <AlertTriangle size={18} className="text-warning-500 shrink-0 mt-0.5" />
      <p className="text-sm text-warning-600">{children}</p>
    </div>
  );
}
