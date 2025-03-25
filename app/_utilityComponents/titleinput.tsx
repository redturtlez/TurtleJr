import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const TitleInput = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn("flex h-8 w-full border-b-2 border-primary bg-transparent px-3 py-2 text-sm placeholder:text-text/20 focus:outline-none", className)}
      ref={ref}
      {...props}
    />
  );
});
TitleInput.displayName = "TitleInput";

export { TitleInput };
