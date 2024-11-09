"use client";

import { CheckUnfilled, CrossCircle, Plus, Trash } from "public/svg";
import { useProteinCostStore, ppd, bestPpd } from "./proteinCostStates";
import { useEffect } from "react";

export default function Content() {
  const proteinCostStore = useProteinCostStore();
  const inputclass = "resize-none rounded-sm bg-secondary p-2 border-1 border-text/20 mr-4";
  const divsclass = "relative flex flex-col space-y-1 text-nowrap";
  const newppd = ppd();
  const bestppd = bestPpd();

  return (
    <div className="mt-2 flex w-full flex-col">
      <div className="flex w-full">
        <div className="mt-2 flex w-1/3 flex-col overflow-hidden">
          {proteinCostStore.items.map((val, index) => (
            <div
              className={
                "mx-4 mt-2 flex h-12 flex-col space-y-2 rounded-sm border-1 text-xl " +
                (proteinCostStore.activeItem == index ? "border-background bg-text text-secondary" : "border-text/20 bg-secondary text-text")
              }
              key={index}
              onClick={() => {
                proteinCostStore.setActiveItem(index);
              }}
            >
              <div className="m-auto">{val.item != null ? val.item : ""}</div>
            </div>
          ))}
          <div
            className={"mx-4 mt-2 h-12 space-y-2 rounded-sm border-1 border-secondary bg-text " + (proteinCostStore.items.length >= 6 ? "hidden" : "flex flex-col")}
            onClick={() => {
              proteinCostStore.addItem();
            }}
          >
            <Plus alt="" className="m-auto fill-background" />
          </div>
          <div
            className={"mx-4 mt-2 h-12 space-y-2 rounded-sm border-1 border-text/20 bg-secondary " + (proteinCostStore.items.length <= 1 ? "hidden" : "flex flex-col")}
            onClick={() => {
              proteinCostStore.deleteItem(proteinCostStore.activeItem);
            }}
          >
            <Trash alt="" className="m-auto fill-text" height={20} width={20} />
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
                onChange={(e) => proteinCostStore.setItemName(proteinCostStore.activeItem, e.currentTarget.value == "" ? null : e.currentTarget.value)}
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
          </div>
        </div>
      </div>
      <div
        className="mx-auto mt-4 overflow-hidden text-nowrap border-t border-text pt-2 text-2xl"
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
        {"Protein per dollar: " + newppd + "g"}
        <div
          className={
            "m-auto mb-0 " +
            ((() => {
              if (proteinCostStore.items.length <= 1) {
                return true;
              }
              return false;
            })()
              ? "hidden"
              : "flex")
          }
        >
          {proteinCostStore.activeItem == bestppd ? (
            // <CheckUnfilled alt="" className={"m-auto fill-accent hover:cursor-pointer"} height={64} width={64} />
            <div className="flex w-full justify-center tracking-widest text-accent">BEST VALUE</div>
          ) : (
            <div className="flex w-full justify-center tracking-widest text-red-500">NOT BEST VALUE</div>
            // <CrossCircle alt="" className={"m-auto stroke-red-500 hover:cursor-pointer"} height={64} width={64} />
          )}
        </div>
      </div>
    </div>
  );
}
