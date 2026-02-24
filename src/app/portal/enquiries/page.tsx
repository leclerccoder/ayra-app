import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isStoredUploadsFileAvailable } from "@/lib/fileAccess";
import EnquiriesTable from "./EnquiriesTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function EnquiriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/portal/login");
  }

  const enquiries = await prisma.enquiry.findMany({
    where: user.role === "ADMIN" ? {} : { clientId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      files: { orderBy: { createdAt: "desc" } },
      project: { select: { id: true, title: true, status: true } },
    },
  });

  const fileUrls = Array.from(
    new Set(
      enquiries.flatMap((enquiry) => enquiry.files.map((file) => file.fileUrl))
    )
  );
  const availabilityEntries = await Promise.all(
    fileUrls.map(async (fileUrl) => [
      fileUrl,
      await isStoredUploadsFileAvailable(fileUrl),
    ] as const)
  );
  const fileAvailability = new Map<string, boolean>(availabilityEntries);

  const enquiryRows = enquiries.map((enquiry) => ({
    id: enquiry.id,
    clientId: enquiry.clientId,
    status: enquiry.status,
    fullName: enquiry.fullName,
    contactEmail: enquiry.contactEmail,
    contactPhone: enquiry.contactPhone,
    serviceType: enquiry.serviceType,
    addressLine: enquiry.addressLine,
    propertyType: enquiry.propertyType,
    propertySize: enquiry.propertySize,
    state: enquiry.state,
    area: enquiry.area,
    budgetRange: enquiry.budgetRange,
    preferredStyle: enquiry.preferredStyle,
    notes: enquiry.notes,
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt.toISOString(),
    files: enquiry.files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      available: fileAvailability.get(file.fileUrl) ?? false,
      sha256: file.sha256,
      createdAt: file.createdAt.toISOString(),
    })),
    project: enquiry.project
      ? {
          id: enquiry.project.id,
          title: enquiry.project.title,
          status: enquiry.project.status,
        }
      : null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enquiries</h1>
          <p className="text-base text-muted-foreground mt-1">
            Manage and track your design enquiries
          </p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/portal/enquiries/new">
            <Plus className="mr-2 h-5 w-5" />
            New Enquiry
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All Enquiries</CardTitle>
          <CardDescription className="text-base">
            {enquiries.length === 0
              ? "No enquiries yet. Create your first enquiry to get started."
              : `Showing ${enquiries.length} enquir${enquiries.length === 1 ? "y" : "ies"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg text-muted-foreground mb-6">No enquiries yet.</p>
              <Button asChild size="lg">
                <Link href="/portal/enquiries/new">Create Enquiry</Link>
              </Button>
            </div>
          ) : (
            <EnquiriesTable
              enquiries={enquiryRows}
              isAdmin={user.role === "ADMIN"}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
