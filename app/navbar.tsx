"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { Cross, Menu } from "public/svg";

const Navbar = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useUser();

  return (
    <>
      <div className="fixed z-[1] flex min-h-[64px] w-full flex-col justify-center bg-[#1f1f1f] text-center  sq:flex-row">
        <div className="flex h-16">
          <Link prefetch={false} href="/" className={" m-auto  ml-6 text-xl font-semibold text-[#def2de] " + (pathname == "/" ? " active" : "")}>
            LOGO
          </Link>

          <div className="m-auto mr-6 sq:hidden ">
            <Menu height={30} width={30} className={" fill-slate-300 " + (menuOpen ? " hidden " : "")} onClick={() => setMenuOpen(true)} />
            <Cross height={30} width={30} className={"fill-slate-300 " + (menuOpen ? "" : " hidden ")} onClick={() => setMenuOpen(false)} />
          </div>
        </div>
        {/* {menuOpen ? ( */}
        <div className={"flex-col text-xl font-semibold text-[#def2de]  sq:ml-auto sq:mr-6 sq:w-fit sq:flex-row" + (menuOpen ? " flex" : " hidden sq:flex")}>
          <Link
            prefetch={false}
            href="/"
            className={"mx-4 flex h-16 items-center justify-center border-y-[1px] border-neutral-900 sq:w-auto " + (pathname == "/" ? " active" : "")}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            HOME
          </Link>
          <Link
            prefetch={false}
            href="/about"
            className={" mx-4 flex h-16 items-center justify-center border-b-[1px] border-neutral-900 sq:w-auto " + (pathname == "/about" ? " active" : "")}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            ABOUT
          </Link>

          <Link
            prefetch={false}
            href="/projects"
            className={" mx-4 flex h-16 items-center justify-center border-b-[1px] border-neutral-900 sq:w-auto " + (pathname == "/projects" ? " active" : "")}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            PROJECTS
          </Link>
          <div className="mx-4 h-16 border-b-[1px] border-neutral-900 sq:w-auto ">
            {!user.isSignedIn && (
              <SignInButton mode="modal">
                <button className="h-16">LOG IN</button>
              </SignInButton>
            )}
            {user.isSignedIn && (
              <SignOutButton>
                <button
                  className=" h-16"
                  onClick={() => {
                    setMenuOpen((prev) => !prev);
                  }}
                >
                  LOG OUT
                </button>
              </SignOutButton>
            )}
          </div>
          {user.isSignedIn && (
            <Link
              prefetch={false}
              href="/todo"
              className={" mx-4 flex h-16  items-center justify-center sq:w-auto " + (pathname == "/todo" || pathname == "/dashboard" ? " active" : "")}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              TODO
            </Link>
          )}
        </div>
        {/* ) : null} */}
      </div>
    </>
  );
};

export default Navbar;
