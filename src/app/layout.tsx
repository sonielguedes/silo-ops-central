import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import SidebarWrapper from "@/components/SidebarWrapper";
import { AuthProvider } from "@/lib/auth-context";
import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SILO OPS Central",
  description: "Centro de Operações Agrícolas em Tempo Real",
  applicationName: "SILO OPS",
  creator: "SILO OPS",
  publisher: "SILO OPS",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "SILO OPS Central",
    description: "Centro de Operações Agrícolas em Tempo Real",
    siteName: "SILO OPS",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SILO OPS Central",
    description: "Centro de Operações Agrícolas em Tempo Real",
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const initialSession = decodeSessionCookie(sessionCookie);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-[#080d12] text-[#c8d8e8] antialiased">
        <AuthProvider initialSession={initialSession}>
          <SidebarWrapper>{children}</SidebarWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
