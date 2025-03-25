import { generateMetadata } from "@/lib/server";
import TodoTabs from "./TodoTabs";

export const metadata = generateMetadata({ title: "To Do", description: "To do list" });
export default async function ToDoPage() {
  return (
    <>
      <TodoTabs />
    </>
  );
}
