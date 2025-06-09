import { generateMetadata } from "../../lib/server";
import Content from "./content";

export const metadata = generateMetadata({ title: "Projects" });

export default async function ProjectsPage() {
  return (
    <div className="animate__animated animate__fadeIn sq:pt-8 flex h-full flex-col items-center">
      <div className="sq:text-6xl sq:pb-8 self-center pb-4 text-4xl font-extrabold">Projects</div>
      <Content />
    </div>
  );
}
