import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type DirectoryPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function DirectoryPage({ searchParams }: DirectoryPageProps) {
  const q = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string") q.set(key, value);
      else if (Array.isArray(value)) {
        for (const part of value) q.append(key, part);
      }
    }
  }
  const qs = q.toString();
  redirect(qs ? `/discover?${qs}` : "/discover");
}
