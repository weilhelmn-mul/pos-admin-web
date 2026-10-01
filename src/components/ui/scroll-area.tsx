'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both'
}

export function ScrollArea({ className, children, orientation = 'vertical', ...props }: ScrollAreaProps) {
  return (
    <div
      data-slot="scroll-area"
      className={cn(
        'relative',
        orientation === 'vertical' && 'overflow-y-auto overflow-x-hidden',
        orientation === 'horizontal' && 'overflow-x-auto overflow-y-hidden',
        orientation === 'both' && 'overflow-auto',
        // custom scrollbar
        '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2',
        '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30',
        '[&::-webkit-scrollbar-track]:bg-transparent',
        '[&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
