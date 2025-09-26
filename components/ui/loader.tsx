import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  color?: "blue" | "white" | "gray";
}

export function Loader({ size = "md", className, color = "blue" }: LoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-2"
  };

  const colorClasses = {
    blue: "border-[#60A5FA]/30 border-t-[#60A5FA]",
    white: "border-white/30 border-t-white",
    gray: "border-gray-300 border-t-gray-600"
  };

  return (
    <div
      className={cn(
        "rounded-full animate-spin",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  );
}

export function LoaderOverlay({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  if (loading) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader size="lg" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function InlineLoader({ text, size = "sm" }: { text?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2">
      <Loader size={size} />
      {text && <span className="text-white/70">{text}</span>}
    </div>
  );
}