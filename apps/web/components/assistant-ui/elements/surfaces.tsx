"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function ShimmerLabel({
  active = true,
  className,
  ...props
}: ComponentProps<"span"> & { active?: boolean }) {
  return (
    <span
      className={cn(active && "shimmer-text motion-reduce:animate-none", className)}
      {...props}
    />
  );
}