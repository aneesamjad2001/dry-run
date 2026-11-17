import { notFound } from "next/navigation";
import { requireMember } from "@/lib/viewer";
import { getDateView } from "@/lib/data";
import { DateRoom } from "@/components/DateRoom";

export const metadata = { title: "Dry run" };

export default async function DatePage({ params }: PageProps<"/dates/[id]">) {
  const { id } = await params;
  const v = await requireMember(`/dates/${id}`);
  const view = await getDateView(id, v.userId);
  if (!view) notFound();
  return <DateRoom initial={view} />;
}
