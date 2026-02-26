import LoginForm from "./LoginForm";

type SearchParams = {
  reset?: string;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const resetSuccessful = params.reset === "success";
  return <LoginForm resetSuccessful={resetSuccessful} />;
}
