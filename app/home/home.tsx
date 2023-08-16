"use client";
import Image from "next/image";
import Link from "next/link";

import { Github, Linkedin } from "public/svg";

export default function HomePage() {
  return (
    <div className="m-auto flex h-full w-full flex-col sq:mt-auto sq:flex-row">
      <div className="m-auto flex h-1/2 w-full flex-col  sq:mr-0 sq:max-w-[50%] ">
        <div className="my-auto ml-6 mr-auto flex flex-col text-4xl font-black sq:mb-56 sq:ml-auto sq:mr-24 sq:text-6xl">
          <div className="mb-2">Hi,</div>
          <div className="mb-2">
            I'm <span className="text-indigo-700">Simonè</span>
          </div>
          <div className="text-2xl">Full Stack Software Engineer</div>
          <div className="mb-auto mt-4 flex h-12 w-32 rounded-xl bg-indigo-700 text-lg font-bold">
            <div className="m-auto">Contact</div>
          </div>
        </div>
      </div>
      <div className="m-auto flex h-1/2 w-full sq:ml-0 sq:max-w-[50%]">
        <div className="flex h-full w-[20%] flex-col sq:hidden">
          <Link href={"https://github.com/redturtlez"} target="_blank">
            <Github className=" mb-6 ml-4 mt-20 fill-inherit" width={30} height={30} onClick={() => {}} />
          </Link>
          <Link href={"https://www.linkedin.com/in/simone-mineo-abc123/"} target="_blank">
            <Linkedin className="m-auto ml-4 mt-0 fill-inherit" width={30} height={30} onClick={() => {}} />
          </Link>
        </div>
        <div className="relative m-auto flex aspect-square w-[70%] sq:ml-2">
          <Image src={"/me.png"} className="" fill alt="none" priority />
        </div>
      </div>
    </div>
  );
}
