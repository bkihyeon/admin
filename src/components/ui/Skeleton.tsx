interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
}

export default function Skeleton({
  className = "",
  height,
  width,
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-surface-tertiary rounded-md ${className}`}
      style={{ height, width }}
    />
  );
}
