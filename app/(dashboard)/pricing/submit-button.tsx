'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ className, children }: { className?: string, children?: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className={className || "w-full bg-white hover:bg-gray-100 text-black border border-gray-200 rounded-full flex items-center justify-center"}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          読み込み中...
        </>
      ) : (
        <>
          {children || "はじめる"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
