import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/auth/guards";
import { getEventForOrganiser } from "@/lib/data/events";
import { listMenuForOrganiser } from "@/lib/data/menu";
import { MenuEditor } from "./menu-editor";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const organiser = await requireOrganiser();

  const event = await getEventForOrganiser(eventId, organiser.id);
  if (!event) notFound();

  // Includes archived courses and options, the organiser needs to see and be
  // able to restore them (Spec 8.4).
  const courses = await listMenuForOrganiser(event.id);

  return <MenuEditor eventId={event.id} courses={courses} />;
}
