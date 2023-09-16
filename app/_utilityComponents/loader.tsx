"use client";

import { BeatLoader } from "react-spinners";

export default function Loader() {
  return (
    <div className="flex">
      <BeatLoader color="#60a093" className="m-auto" size={25} />
    </div>
  );
}
