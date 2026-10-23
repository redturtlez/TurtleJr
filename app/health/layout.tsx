import { generateMetadata } from "@/lib/server";
import HealthNav from "./HealthNav";
import styles from "./health.module.css";

export const metadata = generateMetadata({ title: "Life Dashboard", description: "Daily routines, habits, and priorities" });

export default function HealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>Turtle Jr Health</p>
          <h1>Your day, <span>with room to move.</span></h1>
          <p>Follow what matters now, adapt when plans change, and keep progress visible without chasing perfection.</p>
        </div>
        <HealthNav />
      </header>
      {children}
    </div>
  );
}
