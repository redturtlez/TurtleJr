import { MouseEventHandler } from "react";
import Image from "next/image";

const AddItemButton = (props: { onClick: MouseEventHandler<HTMLDivElement> | undefined }) => {
  return (
    <div
      className="fixed bottom-[1vh] right-[1vh] z-[3] flex h-[12vh] w-[12vh] items-center justify-center rounded-full bg-accent shadow-2xl hover:bg-accent/70"
      onClick={props.onClick}
    >
      <Image src="/plus.svg" height={36} width={36} className="" alt="" />
    </div>
  );
};
export default AddItemButton;
