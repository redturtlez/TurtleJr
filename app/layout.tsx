import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import Navbar from "./navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { generateMetadata } from "utils/server";
import "animate.css";
import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "red",
  colorScheme: "dark",
};
export const metadata = generateMetadata({});
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.className} flex h-full flex-col fill-text text-text`}>
        <ToastContainer />
        <ClerkProvider>
          <Navbar />
          <main className="mt-16 flex h-[calc(100dvh-64px)] w-full justify-center overflow-hidden bg-background">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
