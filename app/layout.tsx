import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import Navbar from "./navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { generateMetadata } from "@/lib/server";
import "animate.css";

export const metadata = generateMetadata({});
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.className} fill-text text-text flex h-[100dvh] flex-col`}>
        <ToastContainer />
        <ClerkProvider dynamic>
          <Navbar />
          <main className="bg-background mt-16 flex w-full flex-1 justify-center overflow-hidden">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
