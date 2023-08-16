import { generateMetadata } from "../../utils/server";

export const metadata = generateMetadata({ title: "Projects" });

export default async function ProjectsPage() {
  return (
    <div className="mt-28 flex flex-col">
      <div className="mx-auto mb-6 text-4xl font-bold sq:text-6xl">Projects</div>
      <div className="mx-auto mt-4 text-lg">placeholder for projects</div>
    </div>
  );
}
