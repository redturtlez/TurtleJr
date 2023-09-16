"use client";
import { Arrow } from "public/svg";
import { useState } from "react";
const jobs = [
  {
    title: "Fedex Ground",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla  pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    url: "/fedex",
  },
  {
    title: "Professional1",
    desc: "Professional1",
    url: "/pro1",
  },
];
const hobbies = [
  {
    title: "Turtle Jr",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla  pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    url: "/turtlejr",
  },
  {
    title: "Hobby1",
    desc: "Hobby1",
    url: "/hobby1",
  },
];
export default function Content() {
  const [tab, setTab] = useState(1);
  const [currentJob, setCurrentJob] = useState(0);
  const [currentHobby, setCurrentHobby] = useState(0);
  const [activeList, setActiveList] = useState(jobs);
  function activePage() {
    if (tab == 1) {
      return currentJob;
    }
    if (tab == 2) {
      return currentHobby;
    }
  }
  function changePage(x: number) {
    if (tab == 1) {
      setCurrentJob((prev) => (prev + x < 0 ? jobs.length - 1 : prev + x > jobs.length - 1 ? 0 : prev + x));
    }
    if (tab == 2) {
      setCurrentHobby((prev) => (prev + x < 0 ? jobs.length - 1 : prev + x > jobs.length - 1 ? 0 : prev + x));
    }
  }

  return (
    <>
      <div className="flex flex-col">
        <div className="flex h-12 w-72 justify-evenly self-center rounded-full bg-neutral-900 py-2 text-lg">
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (tab == 1 ? "bg-neutral-700/50 text-text/100" : " text-text/60 ")}
            onClick={() => {
              setTab(1);
              setActiveList(jobs);
            }}
          >
            Professional
          </div>
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (tab == 2 ? "bg-neutral-700/50 text-text/100" : " text-text/60 ")}
            onClick={() => {
              setTab(2);
              setActiveList(hobbies);
            }}
          >
            Personal
          </div>
        </div>

        <div className="w-10/12  self-center py-4 text-2xl font-semibold"> {activeList.at(activePage()).title}</div>
        <div className="h-64 w-10/12 self-center overflow-y-auto text-xl">{activeList.at(activePage()).desc}</div>
      </div>
      <div className="absolute bottom-0 left-0 flex w-full flex-col">
        <a href={activeList.at(activePage()).url} className="mt-auto h-14 w-36 self-center rounded-xl border-2 border-text/20 bg-secondary p-3 text-center ">
          Read More
        </a>
        <div className="mb-0 flex">
          <div className="h-24 w-1/2" onClick={() => changePage(-1)}>
            <Arrow className="h-full w-full rotate-180 fill-text" />
          </div>
          <div className="h-24 w-1/2" onClick={() => changePage(1)}>
            <Arrow className="h-full w-full fill-text" />
          </div>
        </div>
      </div>
    </>
  );
}
