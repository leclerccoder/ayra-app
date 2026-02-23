import VerifyRegisterForm from "./VerifyRegisterForm";

type SearchParams = {
  email?: string;
};

export default async function RegisterVerifyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";

  return <VerifyRegisterForm initialEmail={email} />;
}

