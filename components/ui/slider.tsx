"use client"

import * as React from "react"
// モジュールが見つからないため、実装をモックに変更
// import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

// シンプルなスライダーモックの実装
const Slider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number[];
    onValueChange?: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number[];
  }
>(({ className, value = [0], min = 0, max = 100, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center h-5",
      className
    )}
    {...props}
  >
    <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-gray-200">
      <div 
        className="absolute h-full bg-blue-500" 
        style={{ width: `${((value[0] || 0) - min) / (max - min) * 100}%` }}
      />
    </div>
    {value?.map((val, i) => (
      <div
        key={i}
        className="block h-4 w-4 rounded-full border border-blue-500 bg-white shadow transition-colors absolute"
        style={{ left: `calc(${((val - min) / (max - min)) * 100}% - 8px)` }}
      />
    ))}
  </div>
))
Slider.displayName = "Slider"

export { Slider } 