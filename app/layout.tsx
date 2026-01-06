import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import Header from "@/components/Header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BuildSimpli",
  description: "BuildSimpli Web Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      // Allow localhost for development
      // In production, Clerk will automatically restrict to configured domains
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en">
        <body className={inter.className}>
          <ConvexClientProvider>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main>{children}</main>
            </div>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

