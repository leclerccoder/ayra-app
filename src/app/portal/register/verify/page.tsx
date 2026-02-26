import VerifyRegisterForm from "./VerifyRegisterForm";

type SearchParams = {
  email?: string;
  expiresAt?: string;
};

export default async function RegisterVerifyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";
  const expiresAt = params.expiresAt?.trim() ?? "";

  return <VerifyRegisterForm initialEmail={email} initialExpiresAt={expiresAt} />;
}
