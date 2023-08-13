import { generateMetadata } from "../utils/server";
import HomePage from "./home/home";

export const metadata = generateMetadata({ title: "Home" });
export default function Home() {
  return (
    <div className="flex h-full w-full">
      <HomePage />
    </div>
  );
}
