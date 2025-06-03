import { create } from "zustand";
import { userBudget, BudgetItems, BudgetItem } from "./budgetServer";

type State = userBudget & {
  activeTab: number;
};

const initialState: State = {
  userid: "",
  budgetItems: new Array(),
  activeTab: 1,
};

type Actions = {
  setUserId: (input: string) => void;
};

export const useBudgetStore = create<State & Actions>()((set, get) => ({
  ...initialState,
  setUserId: (input) => {
    set({ userid: input });
  },
}));
