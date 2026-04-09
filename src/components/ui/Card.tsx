interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-xl border border-border shadow-card ${
        hover
          ? "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
