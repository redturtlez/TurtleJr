import { create } from "zustand";
import { combine } from "zustand/middleware";

const initialState: {
  items: {
    servings: number | null;
    caloriesPerServing: number | null;
    proteinPerServing: number | null;
    price: number | null;
    item: string | null;
  }[];
  activeItem: number;
} = {
  items: [
    {
      servings: null,
      caloriesPerServing: null,
      proteinPerServing: null,
      price: null,
      item: "item 1",
    },
  ],
  activeItem: 0,
};
export const useProteinCostStore = create(
  combine(initialState, (set) => ({
    setServings: (i: number, val: number | null) => {
      set((state) => ({
        items: (() => {
          const currentItems = [...state.items];
          currentItems[i]!.servings = val;
          return currentItems;
        })(),
      }));
    },
    setCaloriesPerServing: (i: number, val: number | null) => {
      set((state) => ({
        items: (() => {
          const currentItems = [...state.items];
          currentItems[i]!.caloriesPerServing = val;
          return currentItems;
        })(),
      }));
    },
    setProteinPerServing: (i: number, val: number | null) => {
      set((state) => ({
        items: (() => {
          const currentItems = [...state.items];
          currentItems[i]!.proteinPerServing = val;
          return currentItems;
        })(),
      }));
    },
    setPrice: (i: number, val: number | null) => {
      set((state) => ({
        items: (() => {
          const currentItems = [...state.items];
          currentItems[i]!.price = val;
          return currentItems;
        })(),
      }));
    },
    addItem: () => {
      set((state) => ({
        items: [
          ...state.items,
          {
            servings: null,
            caloriesPerServing: null,
            proteinPerServing: null,
            price: null,
            item: "item " + (state.items.length + 1),
          },
        ],
      }));
    },
    setActiveItem: (val: number) => {
      set({ activeItem: val });
    },
    ppd: () => {},
  })),
);
