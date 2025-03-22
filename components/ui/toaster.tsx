'use client';

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';

export function Toaster() {
  const { toasts = [] } = useToast() || { toasts: [] };

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
