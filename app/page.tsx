import { Logo } from "public/svg";
import { generateMetadata } from "../utils/server";
import HomePage from "./home/home";

export const metadata = generateMetadata({ title: "Home" });

export default async function Home() {
  return (
    <div className="animate__animated animate__fadeIn flex h-full w-full">
      <HomePage />
    </div>
  );
}
