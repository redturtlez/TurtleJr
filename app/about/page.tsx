import { generateMetadata } from "../../utils/server";

export const metadata = generateMetadata({ title: "About" });

export default async function AboutPage() {
  return (
    <div className="flex h-full w-full">
      <div className="m-auto flex h-3/5 w-3/5 flex-col rounded-lg bg-slate-300">
        <div className="m-auto my-8 text-3xl font-bold">About</div>
        <div className="m-auto mt-4 flex-wrap text-lg">Project under development to showcase skill and experience</div>
      </div>
    </div>
  );
}
