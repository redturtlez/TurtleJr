import ToastHost from "../_utilityComponents/toastHost";

export default function TodoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastHost />
    </>
  );
}
