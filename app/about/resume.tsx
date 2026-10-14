"use client";
import { Cross } from "public/svg";
import { useState } from "react";

export default function Resume() {
  const [hide, setHide] = useState(true);
  return (
    <>
      <button
        type="button"
        className="text-accent w-fit text-left text-sm font-semibold"
        onClick={() => {
          setHide(false);
        }}
      >
        View résumé ↗
      </button>
      <div className="fixed inset-0 z-[100] bg-black/90 p-3 backdrop-blur-md sm:p-7" hidden={hide} role="dialog" aria-modal="true" aria-label="Résumé viewer">
        <button type="button" className="bg-card absolute top-5 right-5 grid h-11 w-11 place-items-center rounded-xl border border-white/15" aria-label="Close résumé" onClick={() => setHide(true)}>
          <Cross width={22} height={22} className="fill-text" />
        </button>
        <object className="mx-auto h-full w-full max-w-5xl overflow-hidden rounded-2xl bg-white" type="application/pdf" data="/my-resume.pdf">
          <div className="pt-24 text-center text-xl text-black">Your browser does not have a PDF viewer.</div>
        </object>
      </div>
    </>
  );
}
