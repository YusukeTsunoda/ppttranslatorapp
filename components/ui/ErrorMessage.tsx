import React from 'react';

type ErrorMessageProps = {
  title: string;
  message: string;
  code?: string;
};

export function ErrorMessage({ title, message, code }: ErrorMessageProps) {
  return (
    <div className="p-4 bg-red-100 border border-red-500 rounded">
      <h2 className="font-bold text-red-700">{title}</h2>
      <p className="text-red-600">{message}</p>
      {code && <pre className="mt-2 text-xs text-red-500">{code}</pre>}
    </div>
  );
}
