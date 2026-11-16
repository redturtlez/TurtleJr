import { generateMetadata } from "../../lib/server";
import AccountsPanel from "./AccountsPanel";
import BudgetPlanner from "./BudgetPlanner";
import SavingsAdvisor from "./SavingsAdvisor";
import GoalsAndGrowth from "./GoalsAndGrowth";
import FinanceOverview from "./FinanceOverview";
import { getFinanceAccounts } from "./financeData";
import { getFinanceBudgetData } from "./financeBudgetData";
import { getFinanceGoals } from "./financeGoalData";
import styles from "./budget.module.css";

export const metadata = generateMetadata({ title: "Finance" });

export default async function BudgetPage() {
  const [accounts, budget, goals] = await Promise.all([getFinanceAccounts(), getFinanceBudgetData(), getFinanceGoals()]);
  return (
    <main className={`${styles.page} page-fade-in`}>
      <FinanceOverview accounts={accounts} budget={budget} goals={goals} />
      <AccountsPanel accounts={accounts} />
      <BudgetPlanner accounts={accounts} data={budget} />
      <SavingsAdvisor accounts={accounts} data={budget} />
      <GoalsAndGrowth accounts={accounts} goals={goals} />
    </main>
  );
}
