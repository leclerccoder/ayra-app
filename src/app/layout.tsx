import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ayra Design (M) Sdn Bhd architect & interior designer in Malaysia",
  description:
    "See past architectural & interior design projects of Ayra Design (M) Sdn Bhd including photos, costs and reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
