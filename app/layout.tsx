import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Inter } from "next/font/google";
import Navbar from "./navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { generateMetadata } from "utils/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata = generateMetadata({});
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-full flex-col`}>
        <ToastContainer />
        <ClerkProvider>
          <Navbar />
          <main className=" mt-16 flex h-[calc(100dvh-64px)] w-full justify-center overflow-hidden fill-[#def2de] text-[#def2de]">{children}</main>
        </ClerkProvider>
        <div className="absolute -z-50 h-[100dvh] w-[100dvw] overflow-hidden ">
          <svg className="min-h-full min-w-full" viewBox="0 0 960 540">
            <rect width="960" height="540" fill="#051405"></rect>
            <g>
              <g transform="translate(38 146)">
                <path d="M0 -109L94.4 -54.5L94.4 54.5L0 109L-94.4 54.5L-94.4 -54.5Z" fill="#4bb563"></path>
              </g>
              <g transform="translate(691 353)">
                <path d="M0 -155.5L134.6 -77.7L134.6 77.7L0 155.5L-134.6 77.7L-134.6 -77.7Z" fill="#4bb563"></path>
              </g>
              <g transform="translate(340 131)">
                <path d="M0 -123L106.5 -61.5L106.5 61.5L0 123L-106.5 61.5L-106.5 -61.5Z" fill="#4bb563"></path>
              </g>
              <g transform="translate(845 79)">
                <path d="M0 -106L91.8 -53L91.8 53L0 106L-91.8 53L-91.8 -53Z" fill="#4bb563"></path>
              </g>
              <g transform="translate(324 524)">
                <path d="M0 -126L109.1 -63L109.1 63L0 126L-109.1 63L-109.1 -63Z" fill="#4bb563"></path>
              </g>
            </g>
          </svg>
        </div>
      </body>
    </html>
  );
}
/*'text': '#def2de',
'background': '#051405',
'primary': '#57d875',
'secondary': '#00614e',
'accent': '#11d9b8', */
