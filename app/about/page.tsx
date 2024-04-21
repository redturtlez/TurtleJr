import { generateMetadata } from "../../utils/server";

export const metadata = generateMetadata({ title: "About" });

export default async function AboutPage() {
  return (
    <div className="animate__animated animate__fadeIn flex flex-col ">
      <div className="mx-auto mb-6 text-4xl font-bold sq:text-6xl">About</div>
      <div className="mx-auto mb-4 text-lg text-balance w-11/12 bg-secondary rounded-xl p-4">
        TurtleJr.dev is an all-in-one portfolio progressive web application created using NextJs, designed with a mobile-first approach. It features various self-made tools like a
        To-Do list, Calorie tracker, Budgeting tool, and more behind a secure login. Additionally, it doubles as a showcase of my programming skills and passion to potential
        employers, reflecting my self-learned and ambitious journey.
        <br />
      </div>
      <div className="mx-auto text-sm">contact me at: simone.mineo424@gmail.com</div>
    </div>
  );
}
