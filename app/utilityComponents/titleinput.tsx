import * as React from "react";
import { cn } from "utils/cnhelper";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const TitleInput = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn("flex h-10 w-full border-b-2 border-neutral-700 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-900 focus:outline-none", className)}
      ref={ref}
      {...props}
    />
  );
});
TitleInput.displayName = "TitleInput";

export { TitleInput };
