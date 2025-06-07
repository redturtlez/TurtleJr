"use client";
import Image from "next/image";
import Link from "next/link";

import { Github, Linkedin } from "public/svg";

export default function HomePage() {
  return (
    <div className="sq:mt-auto sq:flex-row m-auto flex h-full w-full flex-col font-semibold">
      <div className="sq:mr-0 sq:max-w-[50%] m-auto flex h-1/2 w-10/12 flex-col">
        <div className="sq:mb-56 sq:ml-auto sq:mr-24 sq:text-6xl my-auto mr-auto ml-6 flex flex-col text-4xl font-black">
          <div className="">Hi,</div>
          <div className="">
            I'm <span className="text-accent">Simonè</span>
          </div>
          <div className="text-2xl text-balance">Full Stack Software Engineer</div>

          <Link href={"/about"} className="bg-accent/70 mt-4 mb-auto flex h-12 w-32 rounded-xl text-lg font-bold">
            <div className="m-auto">Get in Touch</div>
          </Link>
        </div>
      </div>
      <div className="sq:ml-0 sq:mt-32 sq:max-w-[50%] m-auto flex h-1/2 w-full">
        <div className="sq:hidden flex h-full w-[20%] flex-col">
          <Link href={"https://github.com/redturtlez"} target="_blank">
            <Github className="fill-accent mt-20 mb-6 ml-4" width={30} height={30} onClick={() => {}} />
          </Link>
          <Link href={"https://www.linkedin.com/in/simone-mineo-abc123/"} target="_blank">
            <Linkedin className="fill-accent m-auto mt-0 ml-4" width={30} height={30} onClick={() => {}} />
          </Link>
        </div>
        <div className="sq:ml-2 sq:w-[60%] relative m-auto flex aspect-square w-[70%]">
          <Image src={"/me.png"} className="" fill alt="none" priority />
        </div>
      </div>
    </div>
  );
}
