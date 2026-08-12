import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/auth/guards";
import { getEventForOrganiser } from "@/lib/data/events";
import { listSelectableCourses } from "@/lib/data/menu";
import { resolveEventImages } from "@/lib/data/uploads";
import {
  EventDescription,
  EventFacts,
  EventHero,
  LastUpdatedNotice,
} from "@/components/event-details";
import { RsvpForm } from "@/components/rsvp-form";
import { previewSubmitAction } from "./actions";

export const metadata: Metadata = { title: "Preview the guest experience" };

/**
 * Organiser preview of the guest RSVP journey (Spec 5.2).
 *
 * Renders the real components a guest sees, with a sample guest name, so what
 * the organiser checks is genuinely what will be sent. Submission is disabled
 * both in the UI and in the action behind it.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const organiser = await requireOrganiser();

  const event = await getEventForOrganiser(eventId, organiser.id);
  if (!event) notFound();

  const [courses, images] = await Promise.all([
    listSelectableCourses(event.id),
    resolveEventImages(event),
  ]);

  return (
    <div>
      <div className="notice notice-warning mb-5 flex flex-wrap items-center justify-between gap-3">
        <span>
          <strong className="font-semibold">Preview.</strong> This is what a guest sees after they
          confirm their email address. Nothing here is saved.
        </span>
        <Link href={`/events/${event.id}`} className="btn btn-secondary btn-sm">
          Back to details
        </Link>
      </div>

      <div className="from-blush-50 via-cream-100 to-sky-50 rounded-3xl bg-gradient-to-b p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl">
          <EventHero event={event} headerUrl={images.headerUrl} profileUrl={images.profileUrl} />

          <div className="mt-6 text-center">
            <p className="text-blush-700 text-sm font-semibold tracking-wide uppercase">
              You're invited
            </p>
            <h2 className="mt-1 text-3xl leading-tight">{event.name}</h2>
          </div>

          <div className="card card-padded mt-6 flex flex-col gap-7">
            <EventFacts event={event} />
            <EventDescription description={event.description} />
          </div>

          <div className="card card-padded mt-5">
            <RsvpForm
              preview
              token="preview"
              guestForename="Sam"
              action={previewSubmitAction}
              courses={courses.map((course) => ({
                id: course.id,
                name: course.name,
                options: course.options.map((option) => ({
                  id: option.id,
                  name: option.name,
                  description: option.description,
                  dietaryLabel: option.dietaryLabel,
                })),
              }))}
              initial={{
                status: "accepted",
                dietaryRequirements: "",
                guestMessage: "",
                selections: {},
              }}
            />
          </div>

          <div className="mt-5 text-center">
            <LastUpdatedNotice event={event} />
          </div>
        </div>
      </div>
    </div>
  );
}
