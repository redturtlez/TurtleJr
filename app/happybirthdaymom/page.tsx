import { generateMetadata } from "../../utils/server";

export const metadata = generateMetadata({ title: "Happy Birthday Mom!" });

export default async function ProjectsPage() {
  return (
    <div className="animate__animated animate__fadeIn flex h-full flex-col">
      <div className="self-center py-4 text-2xl font-extrabold sq:text-6xl ">Happy Birthday Mom!</div>
      <div className="rounded-md ring-1 w-10/12 mt-4 mx-auto ring-accent/80 flex flex-col">
        <div className="text-xl w-10/12 mx-auto my-6">This coupon is good for one free sushi burrito meal and/or lunch equivalent of your choice.</div>
        <div className="text-center w-full text-3xl text-accent font-bold">Happy birthday!</div>
        <div className="mt-4 text-sm">*Only redeemable by my mom</div>
      </div>
      <div className="text-sm w-10/12 mx-auto mt-2">*if you found this page and are not my mom, please contact me and let me know how</div>
    </div>
  );
}
