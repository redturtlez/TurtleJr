import { generateMetadata } from "../../utils/server";
import Content from "./content";

export const metadata = generateMetadata({ title: "Protein Cost" });

export default async function ProteinCostPage() {
  return (
    <div className="animate__animated animate__fadeIn flex h-full w-full flex-col">
      <div className="mx-auto mt-4 text-4xl font-extrabold sq:text-6xl">Protein Cost</div>
      <Content />
    </div>
  );
}
