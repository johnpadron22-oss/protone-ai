import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ProTone AI",
  description: "AI-powered email rewriting for the perfect professional tone",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
