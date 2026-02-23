import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
    size?: "sm" | "default" | "lg" | "xl";
    className?: string;
}

const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
};

export function Spinner({ size = "default", className }: SpinnerProps) {
    return (
        <Loader2
            className={cn(
                "animate-spin text-primary",
                sizeClasses[size],
                className
            )}
        />
    );
}

interface LoadingOverlayProps {
    message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border shadow-xl">
                <Spinner size="xl" />
                <p className="text-lg font-medium text-foreground">{message}</p>
            </div>
        </div>
    );
}

interface PageLoadingProps {
    message?: string;
}

export function PageLoading({ message = "Loading..." }: PageLoadingProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] py-16">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-muted animate-pulse" />
                    <Spinner size="xl" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-xl font-medium text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}

interface ButtonLoadingProps {
    loading?: boolean;
    loadingText?: string;
    children: React.ReactNode;
}

export function ButtonContent({ loading, loadingText, children }: ButtonLoadingProps) {
    if (loading) {
        return (
            <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {loadingText || "Please wait..."}
            </>
        );
    }
    return <>{children}</>;
}
