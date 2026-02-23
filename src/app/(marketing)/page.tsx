import fs from "node:fs/promises";
import path from "node:path";
import AyraDomFixes from "../AyraDomFixes";

const bodyPath = path.join(process.cwd(), "src", "content", "ayra-body.html");

async function getBodyHtml() {
  const raw = await fs.readFile(bodyPath, "utf8");
  return raw.replace(/<script[\s\S]*?<\/script>/gi, "");
}

export default async function Home() {
  const bodyHtml = await getBodyHtml();
  return (
    <>
      <main
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
        suppressHydrationWarning
      />
      <AyraDomFixes />
    </>
  );
}
