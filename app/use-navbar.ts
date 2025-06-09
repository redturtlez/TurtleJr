// Custom hook for Navbar state and handlers
// Follows project best practices: explicit types, separation of logic, functional programming
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

interface UseNavbarReturn {
  pathname: string;
  menuOpen: boolean;
  appsOpen: boolean;
  user: ReturnType<typeof useUser>;
  handleMenuToggle: () => void;
  handleAppsToggle: () => void;
  handleNavClick: () => void;
  handleAppNavClick: () => void;
}

export const useNavbar = (): UseNavbarReturn => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [appsOpen, setAppsOpen] = useState<boolean>(false);
  const user = useUser();

  const handleMenuToggle = useCallback((): void => {
    setMenuOpen((prev) => !prev);
    setAppsOpen(false);
  }, []);

  const handleAppsToggle = useCallback((): void => {
    setAppsOpen((prev) => !prev);
  }, []);

  const handleNavClick = useCallback((): void => {
    setMenuOpen((prev) => !prev);
    setAppsOpen(false);
  }, []);

  const handleAppNavClick = useCallback((): void => {
    setMenuOpen((prev) => !prev);
    setAppsOpen((prev) => !prev);
  }, []);

  return {
    pathname,
    menuOpen,
    appsOpen,
    user,
    handleMenuToggle,
    handleAppsToggle,
    handleNavClick,
    handleAppNavClick,
  };
};
