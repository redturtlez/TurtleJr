import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import Navbar from "./navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import { generateMetadata } from "@/lib/server";
import "animate.css";
import type { Viewport } from "next";

export const metadata = generateMetadata({});
export const viewport: Viewport = { themeColor: "#0f1312", colorScheme: "dark", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${GeistSans.className} fill-text text-text flex min-h-[100dvh] flex-col`}>
        <ToastContainer
          position="bottom-right"
          autoClose={4200}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          limit={3}
          theme="dark"
          className="app-toast-container"
          toastClassName="app-toast"
          bodyClassName="app-toast-body"
          progressClassName="app-toast-progress"
        />
        <ClerkProvider dynamic>
          <Navbar />
          <main className="relative mt-[68px] flex min-h-0 w-full flex-1 justify-center overflow-x-hidden">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
