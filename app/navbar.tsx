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
    <div className="fixed z-[1] flex min-h-[64px] w-full flex-col justify-center bg-background text-center sq:flex-row">
      <div className="flex h-16">
        <Link prefetch={false} href="/" className={"m-auto ml-6 text-xl font-semibold text-[#def2de] " + (pathname == "/" ? " underline" : " no-underline")}>
          <Logo className="h-12 w-12" />
        </Link>

        <div className="m-auto mr-6 sq:hidden">
          <Menu height={40} width={40} className={"fill-text " + (menuOpen ? " hidden" : "")} onClick={() => setMenuOpen(true)} />
          <Cross height={40} width={40} className={"fill-text " + (menuOpen ? "" : " hidden")} onClick={() => setMenuOpen(false)} />
        </div>
      </div>

      <div
        className={
          "flex-col text-xl font-semibold text-text decoration-accent decoration-2 underline-offset-8 sq:ml-auto sq:mr-6 sq:flex sq:w-fit sq:flex-row " +
          (menuOpen ? " flex" : " hidden")
        }
      >
        <Link
          prefetch={false}
          href="/"
          className={
            "flex h-16 items-center justify-center border-y-[1px] border-accent px-4 decoration-accent decoration-2 underline-offset-8 hover:underline sq:w-auto sq:border-y-0 " +
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
            "flex h-16 items-center justify-center border-b-[1px] border-accent px-4 decoration-accent decoration-2 underline-offset-8 hover:underline sq:w-auto sq:border-y-0 " +
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
            "flex h-16 items-center justify-center border-b-[1px] border-accent px-4 decoration-accent decoration-2 underline-offset-8 hover:underline sq:w-auto sq:border-y-0 " +
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
            "flex h-16 items-center justify-center border-b-[1px] border-accent px-4 decoration-accent decoration-2 underline-offset-8 hover:underline sq:w-auto sq:border-y-0 " +
            (pathname == "/proteinCost" ? " underline" : " no-underline")
          }
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setAppsOpen(false);
          }}
        >
          PROTEIN COST
        </Link>

        <div className="h-16 border-b-[1px] border-accent px-4 sq:w-auto sq:border-y-0">
          {!user.isSignedIn && (
            <SignInButton mode="modal">
              <button className="h-16 decoration-accent decoration-2 underline-offset-8 hover:underline">LOG IN</button>
            </SignInButton>
          )}
          {user.isSignedIn && (
            <SignOutButton>
              <button
                className="h-16 decoration-accent decoration-2 underline-offset-8 hover:underline"
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
          <div className="relative flex h-16 w-full flex-col sq:w-auto">
            <div
              className={
                "flex min-h-[64px] cursor-pointer items-center justify-center border-b-[1px] border-accent px-4 decoration-accent decoration-2 underline-offset-8 hover:underline sq:border-y-0"
              }
              onClick={() => setAppsOpen((prev) => !prev)}
            >
              APPS
              <CaretDown height={24} width={24} className={"h-full min-w-[25px] fill-[#def2de] " + (appsOpen ? " rotate-180" : " ")} />
            </div>
            <div
              className={
                "relative min-h-[64px] w-full items-center justify-center border-b-[1px] border-accent bg-[#1f1f1f] px-4 decoration-accent decoration-2 underline-offset-8 hover:underline sq:border-y-0 " +
                (appsOpen ? " flex" : "hidden")
              }
            >
              <Link
                prefetch={false}
                href="/todo"
                className={"flex h-16 cursor-pointer items-center justify-center sq:w-auto" + (pathname == "/todo" ? " underline" : " no-underline")}
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
                "relative min-h-[64px] w-full items-center justify-center border-b-[1px] border-secondary bg-[#1f1f1f] px-4 decoration-accent decoration-2 underline-offset-8 hover:underline sq:border-y-0 " +
                (appsOpen ? " flex" : "hidden")
              }
            >
              <Link
                prefetch={false}
                href="/health"
                className={"flex h-16 cursor-pointer items-center justify-center sq:w-auto" + (pathname == "/health" ? " underline" : " no-underline")}
                onClick={() => {
                  setMenuOpen((prev) => !prev);
                  setAppsOpen((prev) => !prev);
                }}
              >
                HEALTH
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
