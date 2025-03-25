import React from "react";
import { cn } from "@/lib/utils";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
const MyCheckbox = React.forwardRef<HTMLInputElement, InputProps>(({ className, label, ...props }, ref) => {
  return (
    <>
      <input
        type="checkbox"
        className="peer hidden"
        ref={ref}
        {...props}
        id={label}
        //onChange={() => ((document?.getElementById(props.label) as HTMLInputElement).value = String(!(document?.getElementById(props.label) as HTMLInputElement).checked))}
      />
      <label
        htmlFor={label}
        className={cn(
          "relative my-auto flex h-6 cursor-pointer select-none pl-5 before:absolute before:left-0 before:top-1 before:flex before:h-4 before:w-4 before:items-center before:rounded-sm before:border before:border-primary before:bg-transparent before:content-[''] peer-checked:before:content-['✓']",
          className,
        )}
      >
        {label}
      </label>
    </>
  );
});
export default MyCheckbox;
