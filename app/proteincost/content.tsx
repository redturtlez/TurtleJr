"use client";

import { Plus } from "public/svg";
import { useProteinCostStore } from "./proteinCostStates";

export default function Content() {
  const proteinCostStore = useProteinCostStore();
  const inputclass = "resize-none rounded-sm bg-secondary p-2 border-1 border-text/20 mr-4";
  const divsclass = "relative flex flex-col space-y-1 text-nowrap";
  return (
    <div className="mt-4 flex w-full">
      <div className="mt-2 flex w-1/3 flex-col space-y-2">
        {proteinCostStore.items.map((val, index) => (
          <div className="mx-auto flex w-full flex-col space-y-2 rounded-xl text-xl" key={index}>
            <div
              className={"mx-4 flex h-12 rounded-sm border-1 border-text/20 " + (proteinCostStore.activeItem == index ? "bg-text text-secondary" : "bg-secondary text-text")}
              onClick={() => {
                proteinCostStore.setActiveItem(index);
              }}
            >
              <div className="m-auto">{val.item != null ? val.item : ""}</div>
            </div>
          </div>
        ))}
        <div className="mx-auto flex w-full flex-col space-y-2 rounded-xl text-xl">
          <div
            className="mx-4 flex h-12 rounded-sm border-1 border-text/20 bg-text text-secondary"
            onClick={() => {
              proteinCostStore.addItem();
            }}
          >
            <div className="m-auto fill-background">
              <Plus />
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-2/3 flex-col">
        <div className="mx-auto flex w-full flex-col space-y-2 rounded-xl text-xl">
          <div className={divsclass}>
            <label className="">Item</label>
            <input
              type="text"
              className={inputclass}
              value={proteinCostStore.items[proteinCostStore.activeItem]!.item ?? ""}
              onChange={(e) => proteinCostStore.setServings(proteinCostStore.activeItem, e.currentTarget.value == "" ? null : e.currentTarget.valueAsNumber)}
            />
          </div>
          <div className={divsclass}>
            <label className="">Servings</label>
            <input
              type="number"
              className={inputclass}
              value={proteinCostStore.items[proteinCostStore.activeItem]!.servings ?? ""}
              onChange={(e) => proteinCostStore.setServings(proteinCostStore.activeItem, e.currentTarget.value == "" ? null : e.currentTarget.valueAsNumber)}
            />
          </div>
          <div className={divsclass}>
            <label className="">Calories/Serving</label>
            <input
              type="number"
              className={inputclass}
              value={proteinCostStore.items[proteinCostStore.activeItem]!.caloriesPerServing ?? ""}
              onChange={(e) => proteinCostStore.setCaloriesPerServing(proteinCostStore.activeItem, e.currentTarget.value == "" ? null : e.currentTarget.valueAsNumber)}
            />
          </div>
          <div className={divsclass}>
            <label className="">Protein/Serving</label>
            <input
              type="number"
              className={inputclass}
              value={proteinCostStore.items[proteinCostStore.activeItem]!.proteinPerServing ?? ""}
              onChange={(e) => proteinCostStore.setProteinPerServing(proteinCostStore.activeItem, e.currentTarget.value == "" ? null : e.currentTarget.valueAsNumber)}
            />
          </div>

          <div className={divsclass}>
            <label className="">Total Price ($)</label>
            <input
              type="number"
              className={inputclass}
              value={proteinCostStore.items[proteinCostStore.activeItem]!.price ?? ""}
              onChange={(e) => proteinCostStore.setPrice(proteinCostStore.activeItem, e.currentTarget.value == "" ? null : e.currentTarget.valueAsNumber)}
            />
          </div>
          <div
            className="overflow-hidden text-nowrap border-t border-text pt-4 text-2xl"
            hidden={(() => {
              if (
                proteinCostStore.items[proteinCostStore.activeItem]!.servings == null ||
                proteinCostStore.items[proteinCostStore.activeItem]!.proteinPerServing == null ||
                proteinCostStore.items[proteinCostStore.activeItem]!.price == null ||
                proteinCostStore.items[proteinCostStore.activeItem]!.caloriesPerServing == null
              ) {
                return true;
              }
              return false;
            })()}
          >
            Protein per dollar:{" "}
            {(
              (proteinCostStore.items[proteinCostStore.activeItem]!.servings! * proteinCostStore.items[proteinCostStore.activeItem]!.proteinPerServing!) /
              proteinCostStore.items[proteinCostStore.activeItem]!.price!
            ).toFixed(4)}
            g
          </div>
        </div>
      </div>
      {/* <div
        className="h-7 w-12 bg-purple-400"
        onClick={() => {
          proteinCostStore.addItem();
        }}
      >
        CLICK
      </div> */}
    </div>
  );
}
