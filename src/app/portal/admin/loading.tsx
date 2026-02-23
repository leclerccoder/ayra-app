import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] py-16">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-primary/20 animate-pulse" />
                    <Spinner size="xl" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                    <p className="text-xl font-medium text-foreground">Loading Admin Panel...</p>
                    <p className="text-base text-muted-foreground mt-2">Please wait while we prepare the admin dashboard</p>
                </div>
            </div>
        </div>
    );
}
