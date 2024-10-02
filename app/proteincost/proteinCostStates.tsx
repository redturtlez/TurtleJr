import { create } from "zustand";
import { combine } from "zustand/middleware";

const initialState: {
  items: {
    servings: number | null;
    caloriesPerServing: number | null;
    proteinPerServing: number | null;
    price: number | null;
    item: string | null;
    ppd?: number | null;
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
    setItemName: (i: number, val: string | null) => {
      set((state) => ({
        items: (() => {
          const currentItems = [...state.items];
          currentItems[i]!.item = val;
          return currentItems;
        })(),
      }));
    },
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
  })),
);

export const ppd = () => {
  const getPPD = useProteinCostStore().items[useProteinCostStore().activeItem];
  return ((getPPD!.servings! * getPPD!.proteinPerServing!) / getPPD!.price!).toFixed(4);
};
export const bestPpd = () => {
  var max = 0;
  var maxI = 0;
  const items = useProteinCostStore().items;
  items.map((val, i) => {
    const temp = (val.servings! * val.proteinPerServing!) / val.price!;
    temp > max
      ? (() => {
          max = temp;
          maxI = i;
        })()
      : null;
  });
  return maxI;
};
