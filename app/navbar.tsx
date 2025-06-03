"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { CaretDown, Cross, Logo, Menu } from "public/svg";

const Navbar = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const user = useUser();

  return (
    <div className="bg-background sq:flex-row fixed z-1 flex min-h-[64px] w-full flex-col justify-center text-center">
      <div className="flex h-16">
        <Link prefetch={false} href="/" className={"m-auto ml-6 text-xl font-semibold text-[#def2de] " + (pathname == "/" ? " underline" : " no-underline")}>
          <Logo className="h-12 w-12" />
        </Link>

        <div className="sq:hidden m-auto mr-6">
          <Menu height={40} width={40} className={"fill-text " + (menuOpen ? " hidden" : "")} onClick={() => setMenuOpen(true)} />
          <Cross height={40} width={40} className={"fill-text " + (menuOpen ? "" : " hidden")} onClick={() => setMenuOpen(false)} />
        </div>
      </div>

      <div
        className={
          "text-text decoration-accent sq:ml-auto sq:mr-6 sq:flex sq:w-fit sq:flex-row flex-col text-xl font-semibold decoration-2 underline-offset-8 " +
          (menuOpen ? " flex" : " hidden")
        }
      >
        <Link
          prefetch={false}
          href="/"
          className={
            "border-accent decoration-accent sq:w-auto sq:border-y-0 flex h-16 items-center justify-center border-y-[1px] px-4 decoration-2 underline-offset-8 hover:underline " +
            (pathname == "/" ? " underline" : " no-underline")
          }
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setAppsOpen(false);
          }}
        >
          HOME
        </Link>
        <Link
          prefetch={false}
          href="/about"
          className={
            "border-accent decoration-accent sq:w-auto sq:border-y-0 flex h-16 items-center justify-center border-b-[1px] px-4 decoration-2 underline-offset-8 hover:underline " +
            (pathname == "/about" ? " underline" : " no-underline")
          }
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setAppsOpen(false);
          }}
        >
          ABOUT
        </Link>

        <Link
          prefetch={false}
          href="/projects"
          className={
            "border-accent decoration-accent sq:w-auto sq:border-y-0 flex h-16 items-center justify-center border-b-[1px] px-4 decoration-2 underline-offset-8 hover:underline " +
            (pathname == "/projects" ? " underline" : " no-underline")
          }
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setAppsOpen(false);
          }}
        >
          PROJECTS
        </Link>

        <Link
          prefetch={false}
          href="/proteincost"
          className={
            "border-accent decoration-accent sq:w-auto sq:border-y-0 flex h-16 items-center justify-center border-b-[1px] px-4 decoration-2 underline-offset-8 hover:underline " +
            (pathname == "/proteinCost" ? " underline" : " no-underline")
          }
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setAppsOpen(false);
          }}
        >
          PROTEIN COST
        </Link>

        <div className="border-accent sq:w-auto sq:border-y-0 h-16 border-b-[1px] px-4">
          {!user.isSignedIn && (
            <SignInButton mode="modal">
              <button className="decoration-accent h-16 decoration-2 underline-offset-8 hover:underline">LOG IN</button>
            </SignInButton>
          )}
          {user.isSignedIn && (
            <SignOutButton>
              <button
                className="decoration-accent h-16 decoration-2 underline-offset-8 hover:underline"
                onClick={() => {
                  setMenuOpen((prev) => !prev);
                  setAppsOpen(false);
                }}
              >
                LOG OUT
              </button>
            </SignOutButton>
          )}
        </div>
        {user.isSignedIn && (
          <div className="sq:w-auto relative flex h-16 w-full flex-col">
            <div
              className={
                "border-accent decoration-accent sq:border-y-0 flex min-h-[64px] cursor-pointer items-center justify-center border-b-[1px] px-4 decoration-2 underline-offset-8 hover:underline"
              }
              onClick={() => setAppsOpen((prev) => !prev)}
            >
              APPS
              <CaretDown height={24} width={24} className={"h-full min-w-[25px] fill-[#def2de] " + (appsOpen ? " rotate-180" : " ")} />
            </div>
            <div
              className={
                "border-accent decoration-accent sq:border-y-0 relative min-h-[64px] w-full items-center justify-center border-b-[1px] bg-[#1f1f1f] px-4 decoration-2 underline-offset-8 hover:underline " +
                (appsOpen ? " flex" : "hidden")
              }
            >
              <Link
                prefetch={false}
                href="/todo"
                className={"sq:w-auto flex h-16 cursor-pointer items-center justify-center" + (pathname == "/todo" ? " underline" : " no-underline")}
                onClick={() => {
                  setMenuOpen((prev) => !prev);
                  setAppsOpen((prev) => !prev);
                }}
              >
                TO DO
              </Link>
            </div>
            <div
              className={
                "border-secondary decoration-accent sq:border-y-0 relative min-h-[64px] w-full items-center justify-center border-b-[1px] bg-[#1f1f1f] px-4 decoration-2 underline-offset-8 hover:underline " +
                (appsOpen ? " flex" : "hidden")
              }
            >
              <Link
                prefetch={false}
                href="/health"
                className={"sq:w-auto flex h-16 cursor-pointer items-center justify-center" + (pathname == "/health" ? " underline" : " no-underline")}
                onClick={() => {
                  setMenuOpen((prev) => !prev);
                  setAppsOpen((prev) => !prev);
                }}
              >
                HEALTH
              </Link>
            </div>
            <div
              className={
                "border-secondary decoration-accent sq:border-y-0 relative min-h-[64px] w-full items-center justify-center border-b-[1px] bg-[#1f1f1f] px-4 decoration-2 underline-offset-8 hover:underline " +
                (appsOpen ? " flex" : "hidden")
              }
            >
              <Link
                prefetch={false}
                href="/budget"
                className={"sq:w-auto flex h-16 cursor-pointer items-center justify-center" + (pathname == "/budget" ? " underline" : " no-underline")}
                onClick={() => {
                  setMenuOpen((prev) => !prev);
                  setAppsOpen((prev) => !prev);
                }}
              >
                BUDGET
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
