"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { useComposedRefs } from "@radix-ui/react-compose-refs"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    // Portal target — pass the enclosing Dialog/Sheet's content node when
    // nesting a Popover inside one. Radix's Dialog FocusScope traps focus by
    // DOM containment, not visual nesting; portaling to document.body (the
    // default) puts Popover content outside that boundary, so keystrokes in
    // e.g. a Command input get yanked back to the Dialog every render.
    container?: HTMLElement | null
  }
>(({ className, align = "center", sideOffset = 4, container, ...props }, ref) => {
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const composedRef = useComposedRefs(ref, localRef);

  React.useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const handleDismiss = () => {
      // If an enclosing Sheet intercepted Escape, close this popover via its trigger
      const trigger = el.ownerDocument.querySelector<HTMLElement>(
        '[aria-haspopup="dialog"][aria-expanded="true"]'
      );
      trigger?.click();
    };
    el.addEventListener("fq:dismiss-popover", handleDismiss);
    return () => el.removeEventListener("fq:dismiss-popover", handleDismiss);
  }, []);

  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        ref={composedRef}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground fq-panel-cast outline-none origin-[--radix-popover-content-transform-origin] scale-95 opacity-0 transition-[transform,opacity] duration-150 ease-out data-[state=open]:scale-100 data-[state=open]:opacity-100 motion-reduce:transition-none motion-reduce:scale-100",
          className
        )}
        data-radix-popover-content=""
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
