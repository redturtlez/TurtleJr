import { generateMetadata } from "../../lib/server";

export const metadata = generateMetadata({ title: "Happy Birthday Mom!" });

export default async function ProjectsPage() {
  return (
    <div className="animate__animated animate__fadeIn flex h-full flex-col">
      <div className="self-center py-4 text-2xl font-extrabold sq:text-6xl">Happy Birthday Mom!</div>
      <div className="mx-auto mt-4 flex w-10/12 flex-col rounded-md ring-1 ring-accent/80">
        <div className="mx-auto my-6 w-10/12 text-xl">This coupon is good for one free sushi burrito meal and/or lunch equivalent of your choice.</div>
        <div className="w-full text-center text-3xl font-bold text-accent">Happy birthday!</div>
        <div className="mt-4 text-sm">*Only redeemable by my mom</div>
      </div>
      <div className="mx-auto mt-2 w-10/12 text-sm">*if you found this page and are not my mom, please contact me and let me know how</div>
    </div>
  );
}
