import { generateMetadata } from "../../utils/server";

export const metadata = generateMetadata({ title: "About" });

export default async function AboutPage() {
  return (
    <div className="flex h-full w-full flex-col text-neutral-200">
      <div className="mx-auto my-8 text-3xl font-bold">About</div>
      <div className="mx-auto my-4 text-lg">this project is. </div>
      <div className="mx-auto my-4">contact me at: simone.mineo424@gmail.com</div>
    </div>
  );
}
