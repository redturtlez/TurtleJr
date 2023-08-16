import { generateMetadata } from "../../utils/server";

export const metadata = generateMetadata({ title: "Projects" });

export default async function ProjectsPage() {
  return (
    <div className="mt-28 flex flex-col">
      <div className="mx-auto mb-6 text-4xl font-bold sq:text-6xl">Projects</div>
      <div className="mx-auto mt-4 text-lg">Projects page is a work in progress. Please excuse the lack of content while it is prepared.</div>
    </div>
  );
}
