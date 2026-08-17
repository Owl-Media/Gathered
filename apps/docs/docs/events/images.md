# Images

Two optional images sit at the top of your event pages. Neither is required — when one is missing, the [artwork theme](/getting-started/create-your-first-event#artwork) you chose is used instead, so an event never looks half-finished.

> 📷 **Screenshot needed:** *Images tab* (`/images/events/images.png`)

## The two images

**Header image** — the wide banner across the top of the event page. A landscape photo works best. Uploads are processed to 1600 × 600 (an 8:3 banner), sized for a high-resolution phone screen.

**Profile image** — the small round image that sits over the banner. A scan photo, or something sweet. Processed to a 800 × 800 square.

Both appear on the [public event page](/invitations/public-event-page), on every guest's [invitation page](/guests/index), and in the [preview](/invitations/preview). The header image is also used as the banner of the [invitation email](/invitations/emails); guests with images disabled in their mail client see a correctly-sized empty space rather than a jumping layout.

## Uploading

Press **Choose an image**, pick a file, then **Upload image**.

- **Formats:** JPG, PNG or WebP.
- **Maximum size:** 5MB.

Photos straight from a phone are fine — images are resized and re-saved automatically after upload, so you do not need to shrink anything first.

An obviously oversized file is caught in the browser before it is uploaded, with a message naming the actual size. The real check happens on the server, where the file is validated by its type, its declared type, its size, and by actually decoding it. A file renamed to `.jpg` that is not an image is rejected.

Once an image is in place the button becomes **Replace image**, and a **Remove image** button appears next to it.

## Removing an image

**Remove image** clears it from the event and the artwork theme takes over again. The stored file is deleted.

## If an upload fails

You will see a clear message rather than a broken page. The common causes:

| Message | What happened |
| --- | --- |
| *That image is 8.2MB. Please choose one under 5MB.* | Caught in your browser before upload |
| *That file is not a valid JPG, PNG or WebP image.* | Wrong format, or not an image at all |
| *That image appears to be damaged. Please try another.* | The file is truncated or corrupt |

Nothing else on the event is affected, and you can pick another file and try again straight away. Repeated uploads are rate limited at 40 in fifteen minutes.

## Where uploaded images are served from

Images are served from the application under a locked-down policy that prevents an uploaded file being executed as code, whichever storage backend the installation uses. Operators can configure either local disk or an S3-compatible bucket; see the deployment documentation in the repository for the details.
