import { Sidebar } from "./Sidebar";

export function Shell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-[240px] max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8 pr-12 md:pr-0">
          {subtitle && (
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-slate-400 mb-1">
              {subtitle}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
        </header>
        {children}
        <footer className="mt-10 text-center text-xs text-slate-400 pb-6">
          FlyBook · All rights reserved © Mohammed Shareef K
        </footer>
      </main>
    </div>
  );
}
