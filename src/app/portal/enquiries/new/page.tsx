import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_SERVICE_TYPES } from "@/lib/portalOptions";
import EnquiryForm from "./EnquiryForm";

export default async function NewEnquiryPage() {
  const user = await getCurrentUser();
  const serviceTypes = await prisma.serviceType.findMany({
    orderBy: [{ name: "asc" }],
  });

  const latestEnquiry = user
    ? await prisma.enquiry.findFirst({
        where: { clientId: user.id },
        orderBy: { updatedAt: "desc" },
        select: {
          fullName: true,
          contactEmail: true,
          contactPhone: true,
        },
      })
    : null;

  const initialValues = {
    fullName: latestEnquiry?.fullName ?? user?.name ?? "",
    contactEmail: user?.email ?? latestEnquiry?.contactEmail ?? "",
    contactPhone: latestEnquiry?.contactPhone ?? "",
  };

  const serviceOptions =
    serviceTypes.length > 0
      ? serviceTypes.map((serviceType) => serviceType.name)
      : DEFAULT_SERVICE_TYPES.map((serviceType) => serviceType.name);

  return <EnquiryForm initialValues={initialValues} serviceOptions={serviceOptions} />;
}
