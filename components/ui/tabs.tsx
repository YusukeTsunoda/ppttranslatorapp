'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Tabs as RadixTabs, TabsList as RadixTabsList, TabsTrigger as RadixTabsTrigger, TabsContent as RadixTabsContent } from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = RadixTabs;

const TabsList = React.forwardRef<
  React.ElementRef<typeof RadixTabsList>,
  React.ComponentPropsWithoutRef<typeof RadixTabsList>
>(({ className, ...props }, ref) => (
  <RadixTabsList
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = RadixTabsList.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof RadixTabsTrigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabsTrigger>
>(({ className, ...props }, ref) => (
  <RadixTabsTrigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = RadixTabsTrigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof RadixTabsContent>,
  React.ComponentPropsWithoutRef<typeof RadixTabsContent>
>(({ className, ...props }, ref) => (
  <RadixTabsContent
    ref={ref}
    className={cn(
      'mt-2 rounded-md border border-muted bg-background p-6',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = RadixTabsContent.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
