"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface DotPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
  dotSize?: number;
  dotSpacing?: number;
  dotColor?: string;
}

export function DotPattern({
  width = 50,
  height = 50,
  dotSize = 1,
  dotSpacing = 16,
  dotColor = "currentColor",
  className,
  ...props
}: DotPatternProps) {
  return (
    <div
      {...props}
      className={cn(
        "absolute inset-0 z-0 h-full w-full opacity-20",
        className
      )}
      style={{
        backgroundImage: `radial-gradient(${dotColor} ${dotSize}px, transparent 0)`,
        backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
      }}
    />
  );
} 