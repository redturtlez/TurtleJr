"use client";
import { Arrow } from "public/svg";
import { useState } from "react";
const jobs = [
  {
    title: "Mphasis - Fedex Ground",
    date: "Mar. 2021 - Present",
    desc: "As a member of the DeepDive scrum team contracted by FedEx Ground, the primary goal was to develop Java Spring APIs adhering to industry standards for security and networking within a full-stack agile framework. This involved utilizing various tools such as Java with Spring Framework, Jenkins, SwaggerAPI, Splunk, AppDynamics, SonarQube/Jacoco test coverage, Redis Persistence, and Cassandra Datastax to ensure the creation of functional and well-tested builds following best coding practices. Microservices were employed for seamless data transfer using Java Message Service, while cloud deployments on secure FedEx hosted machines facilitated easy API access for other teams and services. Knowledge transfers and demos were provided for the developed applications, alongside cooperative system integration testing across testing and production environments with other teams.",
    url: "/about",
  },
  {
    title: "Infosys - AT&T",
    date: "Jul. 2019 - Jan. 2020",
    desc: "I participated in developing an electronic invoice system for a significant AT&T contract, ensuring compliance with industry networking and security standards within an agile scrum team environment. We utilized modern technologies including Java Spring, OracleSQL, and front-end tools to effectively modernize legacy applications as part of the project.",
    url: "/about",
  },
  {
    title: "Revature",
    date: "Feb. 2019 - Jul. 2019",
    desc: "I was a key member in the development and deployment of RideForce, an internal ride-sharing platform for employees to easily find nearby commute options. This involved integrating Google Maps API for distance-based ride matching and collaborating with an agile team across multiple sprints. We utilized various tools like Slack, Gradle, Git, Jenkins, and AWS for streamlined communication, dependency management, version control, and deployments, ensuring efficient development and implementation processes.",
    url: "/about",
  },
];
const hobbies = [
  {
    title: "Turtle Jr",
    date: "Apr. 2023 - Present",
    desc: "TurtleJr.dev is an all-in-one portfolio progressive web application created using NextJs, designed with a mobile-first approach. It features various self-made tools like a To-Do list, Calorie tracker, Budgeting tool, and more behind a secure login. Additionally, it doubles as a showcase of my programming skills and passion to potential employers, reflecting my self-learned and ambitious journey.",
    url: "/about",
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
    return 1;
  }
  function changePage(x: number) {
    if (tab == 1) {
      setCurrentJob((prev) => (prev + x < 0 ? jobs.length - 1 : prev + x > jobs.length - 1 ? 0 : prev + x));
    }
    if (tab == 2) {
      setCurrentHobby((prev) => (prev + x < 0 ? hobbies.length - 1 : prev + x > hobbies.length - 1 ? 0 : prev + x));
    }
  }
  return (
    <>
      <div className="flex w-screen flex-col">
        <div className="flex h-14 w-72 justify-evenly self-center rounded-full bg-secondary py-2 text-lg">
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (tab == 1 ? "bg-accent/80 font-semibold text-text" : " text-accent")}
            onClick={() => {
              setTab(1);
              setActiveList(jobs);
            }}
          >
            Professional
          </div>
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (tab == 2 ? "bg-accent/80 font-semibold text-text" : " text-accent")}
            onClick={() => {
              setTab(2);
              setActiveList(hobbies);
            }}
          >
            Personal
          </div>
        </div>
        <div className="m-auto mt-4 flex w-11/12 flex-col rounded-xl bg-secondary pt-4">
          <div className="w-11/12 self-center pb-2 text-2xl font-bold text-accent"> {activeList.at(activePage())?.title}</div>
          <div className="text-md w-11/12 self-center pb-2 font-bold italic text-text"> {activeList.at(activePage())?.date}</div>
          <div className="text-md h-60 w-11/12 self-center overflow-y-auto">{activeList.at(activePage())?.desc}</div>
          <a href={activeList.at(activePage())?.url} className="m-4 h-12 w-32 self-center rounded-lg bg-accent/80 p-3 text-center">
            Read More
          </a>
        </div>
      </div>
      <div className="m-auto flex w-full">
        <Arrow className="ml-4 mr-auto h-10 w-auto -rotate-90 fill-accent" onClick={() => changePage(-1)} />
        <Arrow className="ml-auto mr-4 h-10 w-auto rotate-90 fill-accent" onClick={() => changePage(1)} />
      </div>
    </>
  );
}
