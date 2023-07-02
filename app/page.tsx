import { generateMetadata } from "../utils/server";
import Auth from "./Auth";

export const metadata = generateMetadata({ title: "Home" });
export default function Home() {
  return (
    <div className="">
      <Auth />
    </div>
  );
}
