import { generateMetadata } from "../../utils/server";

export const metadata = generateMetadata({ title: "Projects" });

export default async function ProjectsPage() {
  return (
    <div className="m-auto flex h-3/5 w-3/5 flex-col rounded-lg bg-slate-300">
      <div className="m-auto my-8 text-3xl font-bold">Projects</div>
      <div className="m-auto mt-4 text-lg">placeholder for projects</div>
      <div></div>
    </div>
  );
}
