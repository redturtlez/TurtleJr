"use client";
// Refactored Navbar using best practices: custom hook, clsx, explicit types, modularity
import Link from "next/link";
import { SignInButton, SignOutButton } from "@clerk/nextjs";
import { CaretDown, Cross, Logo, Menu } from "public/svg";
import clsx from "clsx";
import { useNavbar } from "./use-navbar";

const Navbar = (): JSX.Element => {
  // Use custom hook for state and handlers
  const { pathname, menuOpen, appsOpen, user, handleMenuToggle, handleAppsToggle, handleNavClick, handleAppNavClick } = useNavbar();

  return (
    <div className="bg-background sq:flex-row fixed z-1 flex min-h-[64px] w-full flex-col justify-center text-center">
      <div className="flex h-16">
        <Link prefetch={false} href="/" className={clsx("m-auto ml-6 text-xl font-semibold text-[#def2de]", pathname === "/" ? "underline" : "no-underline")}>
          <Logo className="h-12 w-12" />
        </Link>
        <div className="sq:hidden m-auto mr-6">
          <Menu height={40} width={40} className={clsx("fill-text", menuOpen && "hidden")} onClick={handleMenuToggle} />
          <Cross height={40} width={40} className={clsx("fill-text", !menuOpen && "hidden")} onClick={handleMenuToggle} />
        </div>
      </div>
      <div
        className={clsx(
          "text-text decoration-accent sq:ml-auto sq:mr-6 sq:flex sq:w-fit sq:flex-row flex-col text-xl font-semibold decoration-2 underline-offset-8",
          menuOpen ? "flex" : "hidden",
        )}
      >
        {/* Navigation Links */}
        {(
          [
            { href: "/", label: "HOME" },
            { href: "/about", label: "ABOUT" },
            { href: "/projects", label: "PROJECTS" },
            { href: "/snake", label: "SNAKE GAME" },
            { href: "/proteincost", label: "PROTEIN COST" },
          ] as const
        ).map(({ href, label }) => (
          <Link
            key={href}
            prefetch={false}
            href={href}
            className={clsx(
              "border-accent decoration-accent sq:w-auto sq:border-y-0 flex h-16 items-center justify-center border-b-[1px] px-4 decoration-2 underline-offset-8 hover:underline",
              pathname === href ? "underline" : "no-underline",
            )}
            onClick={handleNavClick}
          >
            {label}
          </Link>
        ))}
        {/* Auth Buttons */}
        <div className="border-accent sq:w-auto sq:border-y-0 h-16 border-b-[1px] px-4">
          {!user.isSignedIn ? (
            <SignInButton mode="modal">
              <button className="decoration-accent h-16 decoration-2 underline-offset-8 hover:underline">LOG IN</button>
            </SignInButton>
          ) : (
            <SignOutButton>
              <button className="decoration-accent h-16 decoration-2 underline-offset-8 hover:underline" onClick={handleNavClick}>
                LOG OUT
              </button>
            </SignOutButton>
          )}
        </div>
        {/* Apps Dropdown */}
        {user.isSignedIn && (
          <div className="sq:w-auto relative flex h-16 w-full flex-col">
            <div
              className={clsx(
                "border-accent decoration-accent sq:border-y-0 flex min-h-[64px] cursor-pointer items-center justify-center border-b-[1px] px-4 decoration-2 underline-offset-8 hover:underline",
              )}
              onClick={handleAppsToggle}
            >
              APPS
              <CaretDown height={24} width={24} className={clsx("h-full min-w-[25px] fill-[#def2de]", appsOpen && "rotate-180")} />
            </div>
            {/* Dropdown Links */}
            {(
              [
                { href: "/todo", label: "TO DO" },
                { href: "/health", label: "HEALTH" },
                { href: "/budget", label: "BUDGET" },
              ] as const
            ).map(({ href, label }) => (
              <div
                key={href}
                className={clsx(
                  "border-secondary decoration-accent sq:border-y-0 relative min-h-[64px] w-full items-center justify-center border-b-[1px] bg-[#1f1f1f] px-4 decoration-2 underline-offset-8 hover:underline",
                  appsOpen ? "flex" : "hidden",
                )}
              >
                <Link
                  prefetch={false}
                  href={href}
                  className={clsx("sq:w-auto flex h-16 cursor-pointer items-center justify-center", pathname === href ? "underline" : "no-underline")}
                  onClick={handleAppNavClick}
                >
                  {label}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
