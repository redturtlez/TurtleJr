import { generateMetadata } from "utils/server";
import TodoTabs from "./TodoTabs";

export const metadata = generateMetadata({ title: "To Do", description: "To do list" });
export default async function ToDoPage() {
  return <TodoTabs />;
}
