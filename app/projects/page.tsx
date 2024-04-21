import { generateMetadata } from "../../utils/server";
import Content from "./content";

export const metadata = generateMetadata({ title: "Projects" });

export default async function ProjectsPage() {
  return (
    <div className="animate__animated animate__fadeIn flex h-full flex-col">
      <div className="self-center pb-4 text-4xl font-extrabold sq:text-6xl ">Projects</div>
      <Content />
    </div>
  );
}
