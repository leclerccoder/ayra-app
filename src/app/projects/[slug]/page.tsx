import Link from "next/link";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  return (
    <main className="container" style={{ padding: "80px 16px" }}>
      <h1 style={{ marginBottom: 12 }}>Project Details</h1>
      <p style={{ marginBottom: 24 }}>
        This is a local placeholder for <strong>{decodedSlug}</strong>.
      </p>
      <Link href="/#projects">Back to portfolio</Link>
    </main>
  );
}
