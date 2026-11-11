'use client';

export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-12 text-center">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-sm text-text-secondary mt-2 max-w-md">{description}</p>
    </div>
  );
}
