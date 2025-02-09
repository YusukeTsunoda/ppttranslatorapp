import * as React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            PowerPointファイルを簡単に翻訳
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            AIを活用して、PowerPointファイルの内容を素早く正確に翻訳します
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            href="/translate"
            className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            今すぐ始める
          </Link>
          <Link
            href="/pricing"
            className="group relative flex w-full justify-center rounded-md border border-indigo-600 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            料金プラン
          </Link>
        </div>
      </div>
    </div>
  );
}
