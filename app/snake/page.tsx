import { generateMetadata } from "../../lib/server";
import SnakeGame from "./SnakeGame";

export const metadata = generateMetadata({ title: "Snake Game" });

export default async function SnakePage() {
  return (
    <div className="animate__animated animate__fadeIn sq:pt-8 flex h-full flex-col items-center">
      <div className="sq:text-6xl sq:pb-8 self-center pb-4 text-4xl font-extrabold">Snake Game</div>
      <SnakeGame />
    </div>
  );
}
