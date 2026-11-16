import { generateMetadata } from "../lib/server";
import HomePage from "./home/home";

export const metadata = generateMetadata({ title: "Home" });

export default async function Home() {
  return (
    <div className="page-fade-in flex min-h-full w-full">
      <HomePage />
    </div>
  );
}
