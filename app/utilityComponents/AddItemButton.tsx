import { MouseEventHandler } from "react";
import Image from "next/image";

const AddItemButton = (props: { onClick: MouseEventHandler<HTMLDivElement> | undefined }) => {
  return (
    <div
      className="static bottom-[1vh] right-[1vh] z-20 flex h-[12vh] w-[12vh] items-center justify-center rounded-full bg-green-800 shadow-2xl hover:bg-green-700"
      onClick={props.onClick}
    >
      <Image src="/plus.svg" height={36} width={36} className="" alt="" />
    </div>
  );
};
export default AddItemButton;
