import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <div className="animate-wobble mb-6 flex size-24 items-center justify-center rounded-[28px] bg-primary-soft text-primary">
        <Icon className="size-11" strokeWidth={2.2} aria-hidden />
      </div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 max-w-xs text-muted-foreground">{text}</p>
    </div>
  );
}
