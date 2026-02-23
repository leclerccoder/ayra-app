import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckoutForm } from "./checkout-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SearchParams = {
  projectId?: string;
  purpose?: string;
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/portal/login");
  }

  const projectId = resolvedParams.projectId;
  const purpose =
    resolvedParams.purpose === "BALANCE" ? "BALANCE" : "DEPOSIT";

  if (!projectId) {
    redirect("/portal/projects");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.clientId !== user.id) {
    redirect("/portal/projects");
  }

  const amount =
    purpose === "DEPOSIT"
      ? project.depositAmount.toString()
      : project.balanceAmount.toString();

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6">
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Mock Online Banking Payment</CardTitle>
            <CardDescription className="text-base mt-2">
              This is a demo payment gateway. No real transaction will be made.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CheckoutForm
              projectId={project.id}
              purpose={purpose}
              amount={amount}
              projectTitle={project.title}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
