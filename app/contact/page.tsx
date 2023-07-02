import { generateMetadata } from "utils/server";

export const metadata = generateMetadata({ title: "Contact" });

export default async function ContactPage() {
  return (
    <div className="m-auto flex h-3/5 w-3/5 flex-col rounded-lg bg-slate-300">
      <div className="m-auto my-8 text-3xl font-bold">Contact</div>
      <div className="m-auto mt-4 text-lg">contact me at:</div>
    </div>
  );
}
