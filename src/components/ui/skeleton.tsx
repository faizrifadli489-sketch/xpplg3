import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // aria-hidden: pembaca layar tidak perlu "membaca" kotak kosong; status memuat diumumkan lewat wadahnya
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-primary/10 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
