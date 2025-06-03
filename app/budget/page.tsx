import { generateMetadata } from "../../lib/server";
import BudgetSummary from "./budgetSummary";
export const metadata = generateMetadata({ title: "Budget" });

export default async function BudgetPage() {
  return (
    <div className="animate__animated animate__fadeIn relative flex h-full w-full flex-col">
      <BudgetSummary />
    </div>
  );
}
