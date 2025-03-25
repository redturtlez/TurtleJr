import { generateMetadata } from "../../lib/server";

export const metadata = generateMetadata({ title: "Health" });

export default async function HealthPage() {
  return (
    <div className="mt-28 flex flex-col">
      <div className="mx-auto mb-6 text-4xl font-bold sq:text-6xl">Health</div>
      <div className="mx-auto mt-4 text-lg">WIP</div>
    </div>
  );
}
