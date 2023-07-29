"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useWindowSize } from "../utils/windowUtil";

const Navbar = () => {
  const pathname = usePathname();
  const size = useWindowSize();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useUser();
  return (
    <>
      <div className="flex h-16 w-full justify-center bg-[#1f1f1f] text-center">
        {menuOpen ? (
          <div className="absolute z-50 mt-16 flex w-screen flex-col text-xl">
            <Link
              prefetch={false}
              href="/"
              className={"navitem w-full border-b-[1px] border-neutral-900 bg-neutral-800 " + (pathname == "/" ? " active" : "")}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              HOME
            </Link>
            <Link
              prefetch={false}
              href="/about"
              className={"navitem w-full border-b-[1px] border-neutral-900 bg-neutral-800 " + (pathname == "/about" ? " active" : "")}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              ABOUT
            </Link>

            <Link
              prefetch={false}
              href="/projects"
              className={"navitem w-full border-b-[1px] border-neutral-900 bg-neutral-800 " + (pathname == "/projects" ? " active" : "")}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              PROJECTS
            </Link>
            <Link
              prefetch={false}
              href="/contact"
              className={"navitem w-full border-b-[1px] border-neutral-900 bg-neutral-800 " + (pathname == "/contact" ? " active" : "")}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              CONTACT
            </Link>
            {user.isSignedIn && (
              <Link
                prefetch={false}
                href="/todo"
                className={"navitem w-full bg-neutral-800 " + (pathname == "/todo" || pathname == "/dashboard" ? " active" : "")}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                TODO
              </Link>
            )}
          </div>
        ) : null}
        <div className="my-auto w-10/12">
          <div className="float-left">
            <Link prefetch={false} href="/" className={"navitem " + (pathname == "/" ? " active" : "")}>
              LOGO
            </Link>
          </div>
          {size.width != undefined && size.width < 800 ? (
            <div className="float-right">
              <Image alt="" src="./menu-burger.svg" height={30} width={30} className="" onClick={() => setMenuOpen((prev) => !prev)} />
            </div>
          ) : (
            <div className="float-right">
              <Link prefetch={false} href="/" className={"navitem  " + (pathname == "/" ? " active" : "")}>
                HOME
              </Link>
              <Link prefetch={false} href="/about" className={"navitem " + (pathname == "/about" ? " active" : "")}>
                ABOUT
              </Link>

              <Link prefetch={false} href="/projects" className={"navitem " + (pathname == "/projects" ? " active" : "")}>
                PROJECTS
              </Link>
              <Link prefetch={false} href="/contact" className={"navitem " + (pathname == "/contact" ? " active" : "")}>
                CONTACT
              </Link>
              {user.isSignedIn && (
                <Link prefetch={false} href="/todo" className={"navitem " + (pathname == "/todo" || pathname == "/dashboard" ? " active" : "")}>
                  TODO
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
