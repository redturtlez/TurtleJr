import { generateMetadata } from "../../lib/server";
import Resume from "./resume";

export const metadata = generateMetadata({ title: "About" });

export default async function AboutPage() {
  return (
    <div className="animate__animated animate__fadeIn flex w-full flex-col">
      <div className="sq:text-6xl mx-auto mb-6 text-4xl font-bold">About</div>
      <div className="bg-secondary sq:text-center mx-auto mb-4 w-11/12 rounded-xl p-4 text-lg text-balance">
        TurtleJr.dev is an all-in-one portfolio progressive web application created using NextJs, designed with a mobile-first approach. It features various self-made tools like a
        To-Do list, Calorie tracker, Budgeting tool, and more behind a secure login. Additionally, it doubles as a showcase of my programming skills and passion to potential
        employers, reflecting my self-learned and ambitious journey.
      </div>
      <Resume />
      <div className="mx-auto text-sm">contact me at: simone.mineo424@gmail.com</div>
    </div>
  );
}
