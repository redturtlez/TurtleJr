import { MouseEventHandler } from "react";
import Image from "next/image";

const AddItemButton = (props: { onClick: MouseEventHandler<HTMLDivElement> | undefined }) => {
  return (
    <div className="mx-auto my-4 flex h-[75px] w-10/12 items-center justify-center rounded-md bg-neutral-600 hover:bg-green-700" onClick={props.onClick}>
      <Image src="/plus.svg" height={36} width={36} className="" alt="" />
    </div>
  );
};
export default AddItemButton;
