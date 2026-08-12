import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/auth/guards";
import { getEventForOrganiser } from "@/lib/data/events";
import { resolveEventImages } from "@/lib/data/uploads";
import { ImagesEditor } from "./images-editor";

export const metadata: Metadata = { title: "Images" };

export default async function ImagesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const organiser = await requireOrganiser();

  const event = await getEventForOrganiser(eventId, organiser.id);
  if (!event) notFound();

  const images = await resolveEventImages(event);

  return (
    <ImagesEditor
      eventId={event.id}
      placeholderTheme={event.placeholderTheme}
      headerUrl={images.headerUrl}
      profileUrl={images.profileUrl}
    />
  );
}
