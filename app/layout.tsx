import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Inter } from "next/font/google";
import Navbar from "./navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-full flex-col`}>
        <ToastContainer />
        <ClerkProvider>
          <Navbar />
          <main className="flex h-[calc(100vh-4rem)] w-full justify-center overflow-hidden bg-slate-600">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
