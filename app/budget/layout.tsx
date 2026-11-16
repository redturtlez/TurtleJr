import ToastHost from "../_utilityComponents/toastHost";

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastHost />
    </>
  );
}
