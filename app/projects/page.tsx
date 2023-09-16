import { generateMetadata } from "../../utils/server";
import Content from "./content";

export const metadata = generateMetadata({ title: "Projects" });

export default async function ProjectsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="self-center py-4 text-4xl font-bold sq:text-6xl ">Projects</div>
      <Content />
    </div>
  );
}
