import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import Navbar from "./navbar";
import "./globals.css";
import { generateMetadata } from "@/lib/server";
import type { Viewport } from "next";

export const metadata = generateMetadata({});
export const viewport: Viewport = { themeColor: "#0f1312", colorScheme: "dark", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${GeistSans.className} fill-text text-text flex min-h-[100dvh] flex-col`}>
        {/* No `dynamic` prop: it makes every page render per request. Auth is enforced server-side by
            proxy.ts and auth(); the client only needs auth state for the navbar, which waits for Clerk. */}
        <ClerkProvider>
          <Navbar />
          <main className="relative mt-[68px] flex min-h-0 w-full flex-1 justify-center overflow-x-hidden">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
