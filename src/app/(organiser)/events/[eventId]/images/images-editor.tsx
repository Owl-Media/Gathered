"use client";

import { useRef, useState } from "react";
import { IMAGE_ACCEPT_ATTRIBUTE, MAX_IMAGE_BYTES } from "@/lib/image-constants";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { PlaceholderHeader, PlaceholderProfile } from "@/components/placeholder-art";
import { removeEventImageAction, uploadEventImageAction } from "./actions";

/**
 * Event images (Spec 4.3, 5.2, 8.6).
 *
 * Both images are optional; when one is absent the event's chosen placeholder
 * artwork is shown instead, so an event never looks unfinished.
 */
export function ImagesEditor({
  eventId,
  placeholderTheme,
  headerUrl,
  profileUrl,
}: {
  eventId: string;
  placeholderTheme: string;
  headerUrl: string | null;
  profileUrl: string | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="notice notice-info">
        JPG, PNG or WebP, up to 5MB. Images are resized and re-saved automatically, so large
        photos straight from a phone are fine.
      </div>

      <ImageCard
        eventId={eventId}
        kind="header"
        title="Header image"
        description="The wide banner across the top of your event page. A landscape photo works best."
        currentUrl={headerUrl}
        placeholder={
          <PlaceholderHeader theme={placeholderTheme} className="h-full w-full" />
        }
        previewClassName="h-36 w-full rounded-2xl sm:h-48"
      />

      <ImageCard
        eventId={eventId}
        kind="profile"
        title="Profile image"
        description="The small round image that sits over the banner, such as a scan photo or something sweet."
        currentUrl={profileUrl}
        placeholder={
          <PlaceholderProfile theme={placeholderTheme} className="h-full w-full" />
        }
        previewClassName="size-28 rounded-full"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ImageCard({
  eventId,
  kind,
  title,
  description,
  currentUrl,
  placeholder,
  previewClassName,
}: {
  eventId: string;
  kind: "header" | "profile";
  title: string;
  description: string;
  currentUrl: string | null;
  placeholder: React.ReactNode;
  previewClassName: string;
}) {
  const [clientError, setClientError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * A quick client-side size check so an obviously oversized file is caught
   * before it is uploaded. The authoritative check runs on the server
   * (Spec 8.1); this only saves the organiser a slow round trip.
   */
  function onFileChosen(fileEvent: React.ChangeEvent<HTMLInputElement>) {
    const file = fileEvent.target.files?.[0];
    setSelectedName(file?.name ?? null);

    if (file && file.size > MAX_IMAGE_BYTES) {
      setClientError(
        `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please choose one under 5MB.`,
      );
      return;
    }
    setClientError(null);
  }

  return (
    <section className="card card-padded">
      <h2 className="text-lg">{title}</h2>
      <p className="text-ink-500 mt-1 mb-5 text-sm">{description}</p>

      <div className="flex flex-wrap items-start gap-5">
        <div
          className={`bg-cream-200 shrink-0 overflow-hidden ${previewClassName} ${
            kind === "profile" ? "border-4 border-white shadow-md" : ""
          }`}
        >
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            placeholder
          )}
        </div>

        <div className="min-w-56 flex-1">
          {!currentUrl && (
            <p className="text-ink-500 mb-3 text-sm">
              No image uploaded, so your chosen artwork is being used.
            </p>
          )}

          <ActionForm action={uploadEventImageAction}>
            {() => (
              <div className="flex flex-col gap-3">
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="kind" value={kind} />

                <div>
                  <label htmlFor={`file-${kind}`} className="field-label">
                    Choose an image
                  </label>
                  <input
                    ref={inputRef}
                    id={`file-${kind}`}
                    name="file"
                    type="file"
                    accept={IMAGE_ACCEPT_ATTRIBUTE}
                    onChange={onFileChosen}
                    className="input file:btn file:btn-secondary file:btn-sm file:mr-3 file:border-0 py-2"
                    aria-invalid={clientError ? true : undefined}
                  />
                  {clientError && (
                    <p className="field-error" role="alert">
                      {clientError}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <SubmitButton
                    className="btn btn-primary btn-sm"
                    pendingLabel="Uploading…"
                    disabled={clientError !== null || selectedName === null}
                  >
                    {currentUrl ? "Replace image" : "Upload image"}
                  </SubmitButton>
                </div>
              </div>
            )}
          </ActionForm>

          {currentUrl && (
            <div className="mt-3">
              <ActionForm action={removeEventImageAction} showFeedback={false}>
                {() => (
                  <>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="kind" value={kind} />
                    <SubmitButton className="btn btn-danger btn-sm">Remove image</SubmitButton>
                  </>
                )}
              </ActionForm>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
