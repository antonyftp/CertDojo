import { cn } from "@/lib/utils";

// The brand kit's mark and lockup, inlined (this file is their canonical
// in-repo source, together with src/app/icon.svg — see also the README
// banners in /img). Inlined rather than served as files so the mark
// follows the active theme exactly like the kit's two variants do: the
// navy squares (#1B2A4A on light) become cream (#EFEBE1) on dark — both
// map to the theme's foreground. The green accent square is #2F7F6B in
// both kit variants, so it stays literal. The wordmark is set in Plex
// Sans (the app's reading voice) instead of the kit's Archivo, which is
// not shipped — Local mode loads no external fonts.

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={cn("fill-foreground size-5 shrink-0", className)}
    >
      <g opacity="0.17">
        <rect x="4" y="4" width="28" height="28" rx="2" />
        <rect x="36" y="4" width="28" height="28" rx="2" />
        <rect x="4" y="36" width="28" height="28" rx="2" />
        <rect x="68" y="36" width="28" height="28" rx="2" />
        <rect x="36" y="68" width="28" height="28" rx="2" />
        <rect x="68" y="68" width="28" height="28" rx="2" />
      </g>
      <rect x="4" y="68" width="28" height="28" rx="2" />
      <rect x="36" y="36" width="28" height="28" rx="2" />
      <rect x="68" y="4" width="28" height="28" rx="2" fill="#2F7F6B" />
    </svg>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  // The mark renders at 28px but keeps a 20px layout box (-my-1), and the
  // wordmark's 20px line matches that box — so headers using the lockup
  // keep the exact height they had at the previous 20px logo size.
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark className="size-7 -my-1" />
      <span className="text-xl leading-none font-medium tracking-tight">
        cert<span className="font-bold">dojo</span>
      </span>
    </span>
  );
}
