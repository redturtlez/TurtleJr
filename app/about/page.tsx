import { generateMetadata } from "../../utils/server";

export const metadata = generateMetadata({ title: "About" });

export default async function AboutPage() {
  return (
    <div className="m-auto mt-36 flex w-10/12 flex-col text-xl  font-semibold text-neutral-200 sq:w-8/12 sq:text-2xl">
      <div className="mx-auto mb-6 text-4xl font-bold sq:text-6xl">About</div>
      <div className="mx-auto mb-4">
        this website/portfolio is my all-in-one project. It serves a purpose as a place for others to view my work and for me to develop tools and applications that I am driven to
        create
      </div>
      <div className="mx-auto">contact me at: simone.mineo424@gmail.com</div>
    </div>
  );
}
