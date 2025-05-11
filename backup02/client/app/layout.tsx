import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider, SignUp, SignedIn, SignedOut } from "@clerk/nextjs";
import AuthenticatedLayout from "./components/authenticated-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RagVeda - AI Document Chat",
  description: "Chat with your documents using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider> 
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <SignedOut>
            <div className="flex justify-center items-center min-h-screen bg-background">
              <SignUp />
            </div>
          </SignedOut>
   
          <SignedIn>
            <AuthenticatedLayout>
              {children}
            </AuthenticatedLayout>
          </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}

