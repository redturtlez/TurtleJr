"use client";
import { Arrow } from "public/svg";
import { useState } from "react";
const jobs = [
  {
    title: "Mphasis - Fedex Ground",
    date: "Mar. 2021 - Present",
    desc: `- Led development of 5+ enterprise-scale microservices using Java (Spring Boot), JMS, Redis, and Cassandra, powering logistics systems that processed up to 100M+ packages/day.
- Architected queue-based messaging flows and caching layers to ensure reliable, scalable service communication across FedEx and USPS integrations.
- Directed a team of 10 engineers for 6 months, mentoring junior devs, managing sprint planning, and collaborating with stakeholders to define technical strategy and delivery goals.
- Drove CI/CD migration from Jenkins to GitHub Actions, optimizing cloud-based deployment and reducing operational costs.
- Delivered integration-tested, production-grade APIs with full documentation, while coordinating with cross-functional teams to ensure end-to-end delivery and data integrity.`,
    url: "/about",
  },
  {
    title: "Infosys - AT&T",
    date: "Jul. 2019 - Mar. 2020",
    desc: `- Modernized legacy invoicing applications processing ~10K transactions daily by upgrading Java Spring 3 to Spring 5, refactored backend MVC components and unit tests for performance, readability, and maintainability.
- Cleaned up outdated code patterns and replaced deprecated Java/Spring features with modern equivalents, leaving comprehensive inline documentation to support long-term scalability.
- Collaborated within an Agile Scrum team using Angular (frontend) and Oracle SQL (data layer) to deliver secure, standards-aligned software for enterprise billing workflows.`,
    url: "/about",
  },
  {
    title: "Revature",
    date: "Feb. 2019 - Jul. 2019",
    desc: `- Developed the backend of RideForce, an internal ride-sharing web app using Java (Spring Boot) and Oracle SQL. Enabled ~500 employees to coordinate commutes and optimized ride matches with Google Maps API integration.
- Built MVC architecture and database access layers, and JUnit tests to ensure clean, reliable development, contributed to Angular UI and implemented logic for selecting least-deviation drivers.
- Maintained CI/CD pipelines and cloud deployments using Jenkins, Git, Gradle, AWS, and Docker in an Agile team environment.`,
    url: "/about",
  },
];
const hobbies = [
  {
    title: "Turtle Jr",
    date: "Apr. 2023 - Present",
    desc: "TurtleJr.dev is a full-featured, mobile-first portfolio web app built with Next.js, TypeScript, and Tailwind CSS, and deployed on Vercel. More than just a resume site, it functions as a secure, progressive web application (PWA) housing a growing suite of personal productivity tools—including a To-Do list, Calorie Tracker, and Budgeting Assistant. The platform demonstrates not only my technical proficiency in building scalable, component-driven frontend architectures, but also my initiative, product thinking, and self-driven learning journey. Every feature is designed, developed, and refined by me to showcase real-world engineering skills and a passion for continuous improvement.",
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
        <div className="bg-secondary flex h-14 w-72 justify-evenly self-center rounded-full py-2 text-lg">
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (tab == 1 ? "bg-accent/80 text-text font-semibold" : " text-accent")}
            onClick={() => {
              setTab(1);
              setActiveList(jobs);
            }}
          >
            Professional
          </div>
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (tab == 2 ? "bg-accent/80 text-text font-semibold" : " text-accent")}
            onClick={() => {
              setTab(2);
              setActiveList(hobbies);
            }}
          >
            Personal
          </div>
        </div>
        <div className="bg-secondary m-auto mt-4 flex w-11/12 flex-col rounded-xl pt-4">
          <div className="text-accent w-11/12 self-center pb-2 text-2xl font-bold"> {activeList.at(activePage())?.title}</div>
          <div className="text-md text-text w-11/12 self-center pb-2 font-bold italic"> {activeList.at(activePage())?.date}</div>
          <div className="text-md h-60 w-11/12 self-center overflow-y-auto whitespace-pre-wrap">{activeList.at(activePage())?.desc}</div>
          <a href={activeList.at(activePage())?.url} className="bg-accent/80 m-4 h-12 w-32 self-center rounded-lg p-3 text-center">
            Read More
          </a>
        </div>
      </div>
      <div className="m-auto flex w-full">
        <Arrow className="fill-accent mr-auto ml-4 h-10 w-auto -rotate-90" onClick={() => changePage(-1)} />
        <Arrow className="fill-accent mr-4 ml-auto h-10 w-auto rotate-90" onClick={() => changePage(1)} />
      </div>
    </>
  );
}
