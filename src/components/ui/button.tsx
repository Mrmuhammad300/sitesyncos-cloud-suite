import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out-expo active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.25),0_1px_2px_0_hsl(var(--shadow-color)/0.3),0_0_0_1px_hsl(var(--primary)/0.6)] hover:bg-primary/90 hover:shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.25),0_8px_24px_-8px_hsl(var(--primary)/0.6),0_0_0_1px_hsl(var(--primary)/0.7)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.2)] hover:bg-destructive/90",
        outline:
          "border border-border bg-surface-1/60 text-foreground shadow-[0_1px_2px_0_hsl(var(--shadow-color)/0.15)] hover:border-border-strong hover:bg-surface-2",
        secondary: "bg-secondary text-secondary-foreground hover:bg-surface-3",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        subtle: "bg-primary/10 text-primary hover:bg-primary/15",
      },
      size: {
        default: "h-9 px-4",
        xs: "h-7 rounded-md px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 rounded-md px-3 text-[13px]",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
