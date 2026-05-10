interface PageHeaderProps {
  title: string;
  badge?: string;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  badge,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">
          {title}
        </h2>
        {badge && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
            {badge}
          </span>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
