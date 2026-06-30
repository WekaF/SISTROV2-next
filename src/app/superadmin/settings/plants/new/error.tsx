"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="p-8 text-red-600">
      <h2 className="text-lg font-bold mb-2">Render Error</h2>
      <pre className="text-sm whitespace-pre-wrap">{error?.message}</pre>
      <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{error?.stack}</pre>
    </div>
  );
}
