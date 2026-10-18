"use client";

import { SignInButton, SignOutButton } from "@clerk/nextjs";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import type { JSX } from "react";
import { CaretDown, Cross, Menu } from "@/public/svg";
import styles from "./navbar.module.css";
import { useNavbar } from "./use-navbar";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/art", label: "Art" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/card-creator", label: "Card Studio" },
  { href: "/proteincost", label: "Protein Cost" },
] as const;

const appLinks = [
  { href: "/todo", label: "To Do" },
  { href: "/health", label: "Life" },
  { href: "/budget", label: "Finance" },
] as const;

export default function Navbar(): JSX.Element {
  const { pathname, menuOpen, appsOpen, user, handleMenuToggle, handleAppsToggle, handleNavClick, handleAppNavClick } = useNavbar();
  const isActive = (href: string): boolean => href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Primary navigation">
        <Link prefetch={false} href="/" className={styles.brand} onClick={handleNavClick} aria-label="Turtle Jr home">
          <Image className={styles.logo} src="/newlogocrop.png" width={38} height={38} alt="" priority />
          <span className={styles.wordmark}>Turtle Jr</span>
        </Link>
        <button type="button" className={styles.menuButton} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="primary-navigation-links" onClick={handleMenuToggle}>
          <Menu className={clsx(styles.menuIcon, menuOpen && styles.hidden)} />
          <Cross className={clsx(styles.menuIcon, !menuOpen && styles.hidden)} />
        </button>
        <div id="primary-navigation-links" className={clsx(styles.links, menuOpen && styles.linksOpen)}>
          <div className={styles.primaryLinks}>
            {primaryLinks.map(({ href, label }) => (
              <Link key={href} prefetch={false} href={href} className={clsx(styles.navLink, isActive(href) && styles.activeLink)} aria-current={isActive(href) ? "page" : undefined} onClick={handleNavClick}>
                {label}
              </Link>
            ))}
          </div>
          <div className={styles.accountArea}>
            {user.isSignedIn && (
              <div className={styles.appsMenu}>
                <button type="button" className={styles.accountButton} onClick={handleAppsToggle} aria-expanded={appsOpen}>
                  Apps <CaretDown className={clsx(styles.caret, appsOpen && styles.caretOpen)} />
                </button>
                <div className={clsx(styles.dropdown, appsOpen && styles.dropdownOpen)}>
                  {appLinks.map(({ href, label }) => <Link key={href} prefetch={false} href={href} className={styles.dropdownLink} onClick={handleAppNavClick}>{label}</Link>)}
                </div>
              </div>
            )}
            {!user.isSignedIn ? (
              <SignInButton mode="modal" oauthFlow="redirect"><button type="button" className={styles.loginButton}>Log in</button></SignInButton>
            ) : (
              <SignOutButton><button type="button" className={styles.loginButton} onClick={handleNavClick}>Log out</button></SignOutButton>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
