# Hardened Specification: Gathered Platform

## 1. Purpose

The purpose of this system is to provide a simple, elegant RSVP management platform for baby shower events.

The platform allows an event organiser to create and manage baby shower events, invite individual guests, collect RSVP responses, capture course-based menu selections, record dietary requirements, and export attendance information.

The platform must prioritise:

* Ease of use for non-technical organisers
* A polished, baby-shower-appropriate visual design
* Mobile-first guest RSVP experience
* Strong privacy boundaries between guests
* Reliable organiser access control
* Clear exportable planning data

---

## 2. Problem Statement

When organising a baby shower, it is difficult to keep track of:

* Who has been invited
* Who has accepted
* Who has declined
* Who has not responded
* What each attending guest wants to eat
* Whether guests have allergies or dietary requirements
* Whether guests still have access to the event date, time, and location details

Physical invitations and informal replies can be lost or scattered across text messages, calls, emails, and spreadsheets.

This platform solves the problem by giving each event a central event page and giving each guest a private RSVP link.

---

## 3. Users & Stakeholders

## 3.1 Event Organiser

The event organiser is the main registered user.

An event organiser can:

* Register for an account
* Log in
* Reset their password
* Create multiple events
* Edit events they own
* Add guests to events
* Send invitation emails
* Copy guest invitation links manually
* View RSVP responses
* Manually update guest RSVP details
* Export RSVP data as PDF
* Export RSVP data as CSV

Each event belongs to exactly one event organiser in the MVP.

Events cannot have multiple organisers in the MVP.

---

## 3.2 Guest

A guest does not create an account.

A guest can:

* Open their unique private invitation link
* View the event details
* Verify access by entering their email address
* Accept or decline the invitation
* Select menu choices when accepting
* Add optional dietary requirements
* Add an optional message to the organiser
* Return later and update their response before the RSVP deadline

Each invitation represents exactly one named guest in the MVP.

The MVP does not support group invitations or plus-ones.

---

## 3.3 Superadmin

A superadmin is an internal operational user.

A superadmin can:

* View organiser accounts
* View events across the platform
* View event-level RSVP summaries
* View basic audit information
* Disable organiser accounts

Superadmin functionality is in scope for MVP.

Superadmins must not be able to impersonate organisers in the MVP.

Superadmins must not edit guest RSVP data in the MVP.

Superadmins should not view sensitive guest-level dietary requirements or guest messages unless an explicit support-access workflow is added later.

---

## 3.4 Non-Users

The MVP does not support:

* Guest accounts
* Multiple organisers per event
* Group invitations
* Plus-ones
* Vendors
* Venue staff
* Paid attendees
* Public event browsers

---

## 4. Inputs

## 4.1 Organiser Account Inputs

Organiser registration requires:

* Name
* Email address
* Password

Organiser login requires:

* Email address
* Password

Password reset requires:

* Email address
* Secure reset token
* New password

Password reset is required in the MVP.

Organiser email verification is not required for MVP unless added later.

---

## 4.2 Event Inputs

An organiser can create and edit events.

Each event must support:

* Event name
* Event date
* Start time
* End time
* Location name
* Location address
* Event description/details
* RSVP deadline
* Optional header image
* Optional event profile image

Required fields:

* Event name
* Event date
* Start time
* End time
* Location name
* Location address
* RSVP deadline

Optional fields:

* Event description/details
* Header image
* Event profile image

Validation rules:

* Event date must be a valid calendar date.
* Start time must be before end time.
* RSVP deadline must be before or on the event date.
* Event name must not be empty.
* Location name and location address must not be empty.
* Description must support plain text or safe rich text only.
* Unsafe HTML, scripts, embedded iframes, and executable content must be rejected or sanitised.

Recommended MVP decision:

* Location is stored as plain text.
* Map integrations and address autocomplete are out of scope for MVP.

---

## 4.3 Image Inputs

Event images are optional.

Image types:

* Header image
* Event profile image

Supported formats:

* JPG
* PNG
* WebP

Maximum size:

* 5MB per image

Image rules:

* Images must be validated server-side.
* Images must be checked by MIME type and file extension.
* Uploaded files must not be executable.
* Uploaded files must be stored outside the application source directory.
* Images should be resized or transformed for consistent display.
* If no image is uploaded, the system must use elegant default placeholders.

---

## 4.4 Menu Inputs

The MVP must support course-based menus.

An organiser can create zero or more menu courses.

Each course requires:

* Course name
* Display order
* One or more menu options

Each menu option requires:

* Option name
* Display order

Optional menu option fields:

* Short description
* Dietary label, for example vegetarian or vegan

Rules:

* If no courses exist, the RSVP flow skips menu selection.
* If one or more courses exist, accepted guests must select exactly one option per course.
* Declined guests do not select menu options.
* Each course must have at least one active option before the menu can be used by guests.
* Course and option ordering must be stable and organiser-controlled.

Data integrity rule:

* Menu options that have already been selected by guests must not be hard-deleted.
* They should be soft-deleted, archived, or marked unavailable to preserve historical RSVP data.

---

## 4.5 Guest Inputs

An organiser adds guests to an event.

Each guest requires:

* Forename
* Surname
* Email address

Validation rules:

* Forename must not be empty.
* Surname must not be empty.
* Email address must be syntactically valid.
* Email address must be stored in normalised lowercase form for matching.
* Duplicate guest email addresses within the same event should be prevented unless explicitly allowed later.

Recommended MVP decision:

* One active guest record per email address per event.
* Duplicate email addresses for the same event are not allowed.

Each guest receives:

* A unique private RSVP token
* A private RSVP link

The organiser can:

* Send the guest an invitation email from the platform
* Copy the guest’s private invitation link and share it manually

---

## 4.6 Guest RSVP Inputs

When opening a private RSVP link, a guest must verify access by entering their email address.

The entered email address must match the email address stored against that guest invitation.

After verification, the guest can submit:

* RSVP status
* Menu selections, if accepting and menu courses exist
* Dietary requirements or allergies
* Optional message to the organiser

Valid RSVP statuses:

* Not Responded
* Accepted
* Declined

Guest-submitted dietary requirements:

* Optional
* Free text
* Visible to the event organiser
* Included in exports
* Treated as sensitive personal information

Guest message:

* Optional
* Free text
* Visible to the event organiser
* Included in exports unless excluded later by product decision

Validation rules:

* Accepted guests must complete all required menu selections.
* Declined guests must not be required to provide menu choices.
* Dietary requirements must remain optional.
* Message must remain optional.
* Free-text fields must have sensible length limits.
* Free-text fields must be sanitised before display.

Recommended MVP limits:

* Dietary requirements: 1,000 characters
* Guest message: 1,000 characters

---

## 5. Outputs

## 5.1 Organiser Dashboard

The organiser dashboard must show all events owned by the logged-in organiser.

For each event, display:

* Event name
* Event date
* RSVP deadline
* Number invited
* Number accepted
* Number declined
* Number not responded

Dashboard quick actions:

* View public event page
* Manage event
* Manage guests
* Export PDF
* Export CSV

Dashboard rules:

* Organisers must only see their own events.
* Disabled organisers must not access the dashboard.
* Deleted or archived events should not appear in the normal dashboard unless archive support is explicitly added later.

---

## 5.2 Event Management Page

The event management page must include:

* Event details editor
* Image editor
* Menu/course editor
* Guest list
* RSVP summary
* Public event link
* Guest invitation links
* PDF export button
* CSV export button

Layout:

* Desktop: tabbed interface
* Mobile: stacked sections

Required sections:

1. Details
2. Images
3. Menu
4. Guests
5. Responses
6. Exports

The organiser must be able to preview:

* The public event page
* The guest RSVP journey

Preview mode must not allow actual RSVP submission.

---

## 5.3 Public Event Page

Each event has a unique public event link.

The public event page shows:

* Event name
* Header image or default placeholder
* Event profile image or default placeholder
* Event date
* Start time
* End time
* Location name
* Location address
* Event description/details
* Menu information, if appropriate
* Last updated notice, where applicable

The public event page must not show:

* Guest list
* RSVP counts
* Names of attending guests
* Names of declined guests
* Menu choices submitted by guests
* Dietary requirements
* Guest messages
* Private RSVP links

Indexing rule:

* Public event pages should include `noindex` metadata.
* Public event pages must not be included in any public site directory or sitemap.

Recommended MVP decision:

* Public event links should use a human-readable slug plus a short random suffix, or a random token.
* The final implementation must ensure links are not easily guessable.

---

## 5.4 Private Guest RSVP Page

Each guest has a unique private RSVP link.

The private RSVP page must:

* Display event details
* Ask the guest to enter their email address before RSVP access
* Verify email against the guest invitation
* Allow the guest to accept or decline
* Collect required menu choices when accepting
* Collect optional dietary requirements
* Collect optional guest message
* Show a confirmation screen after submission

If the guest has previously responded:

* The page should show their current saved response.
* The guest may update their response before the RSVP deadline.
* The update overwrites the previous active response.
* The system must update the last response timestamp.

Security rules:

* The RSVP token alone is not sufficient to submit a response.
* The matching guest email address is also required.
* Email verification must be enforced server-side.
* Error messages must not reveal the correct email address.

---

## 5.5 PDF Export

The organiser must be able to download a PDF export for each event.

The PDF must include:

* Event name
* Event date
* Start time
* End time
* Location name
* Location address
* RSVP deadline
* Export generation timestamp
* Total invited guests
* Total accepted
* Total declined
* Total not responded

The PDF must include all active invited guests grouped by RSVP status.

Each guest row must include:

* Forename
* Surname
* Email address
* RSVP status
* Menu choices
* Dietary requirements
* Optional guest message
* Last response timestamp
* Response source

Response source values:

* Guest submitted
* Organiser edited
* Not responded

Rules:

* Removed guests are excluded from normal PDF exports.
* PDF generation must respect organiser ownership.
* Organisers must not export events they do not own.
* PDF output must be usable for event planning and printing.

---

## 5.6 CSV Export

The organiser must be able to download a CSV export for each event.

The CSV must include all active invited guests.

Each row must include:

* Event name
* Event date
* Guest forename
* Guest surname
* Guest email
* RSVP status
* Menu choices
* Dietary requirements
* Optional guest message
* Last response timestamp
* Response source

Recommended MVP decision:

* CSV should include one column per menu course where possible.
* If course names are dynamic, column headers should use the course name.
* If no menu courses exist, menu columns may be omitted or left empty.

Rules:

* Removed guests are excluded from normal CSV exports.
* CSV generation must respect organiser ownership.
* CSV values must be safely escaped.
* CSV output must be compatible with common spreadsheet tools.

---

## 6. Core Behaviour

## 6.1 Organiser Registration and Login

The organiser can register using name, email address, and password.

The organiser can log in using email address and password.

The organiser can request a password reset.

Authentication must protect all organiser routes.

Access control must be checked server-side.

Client-side route hiding is not sufficient.

An organiser must only access:

* Their own dashboard
* Their own events
* Their own guests
* Their own exports

---

## 6.2 Event Creation

An authenticated organiser can create a new event.

The organiser must provide all required event fields.

On creation, the system must:

* Save the event
* Associate the event with the organiser
* Generate a unique public event link
* Add the event to the organiser dashboard
* Store created timestamp
* Store updated timestamp

---

## 6.3 Event Editing

An organiser can edit events they own.

Editable fields:

* Event name
* Event date
* Start time
* End time
* Location name
* Location address
* Description/details
* RSVP deadline
* Header image
* Event profile image
* Menu courses
* Menu options

When core event details change:

* Public event page updates immediately.
* Guest RSVP pages update immediately.
* Event `updated_at` timestamp changes.
* Guest-facing page shows a visible last updated notice.

Core event details include:

* Event name
* Event date
* Start time
* End time
* Location name
* Location address
* Description/details
* Menu details

Recommended MVP decision:

* The last updated notice should show the latest updated date and time.
* The MVP does not require a visible change log.

---

## 6.4 Guest Management

An organiser can add guests to an event.

Each guest must have:

* Forename
* Surname
* Email address

On guest creation, the system must:

* Create guest record
* Associate guest with the event
* Generate unique RSVP token
* Set RSVP status to Not Responded
* Store created timestamp

The organiser can remove guests.

Guest removal behaviour:

* Guest is soft-deleted or marked inactive.
* Guest private RSVP link becomes invalid.
* Guest is excluded from normal organiser views.
* Guest is excluded from normal exports.
* Guest data may be retained internally for audit purposes.

Recommended MVP decision:

* Use soft deletion for guests.
* Do not permanently delete guest records by default.
* Exclude soft-deleted guests from normal UI and exports.

---

## 6.5 Invitation Email Behaviour

The platform must support invitation emails.

Email use cases in MVP:

* Invitation email
* Password reset email

The platform must not send guest emails automatically except where explicitly triggered.

Rules:

* Invitation emails are sent only when the organiser explicitly chooses to send them.
* Reminder emails are out of scope.
* Guest RSVP confirmation emails are out of scope.
* Event update notification emails are out of scope.
* Email failures must be visible to the organiser.
* Email send attempts must be logged.

The email provider is undecided.

Implementation requirement:

* Use a configurable transactional email provider.
* Provider settings must come from environment variables.
* Email sending logic must be abstracted so the provider can be changed later.

Invitation email must include:

* Event name
* Event date
* Event start time
* Event location
* Private guest RSVP link

Invitation email may include:

* Event organiser name
* Short event description

Invitation email must not include:

* Other guest details
* RSVP counts
* Private links belonging to other guests

---

## 6.6 Guest RSVP Flow

The guest RSVP flow:

1. Guest opens private RSVP link.
2. System checks token validity.
3. System displays event details and email verification prompt.
4. Guest enters email address.
5. System compares entered email with stored guest email.
6. If email matches, RSVP form is displayed.
7. Guest selects Accepted or Declined.
8. If Accepted:

   * Guest selects one option for each menu course if courses exist.
   * Guest may enter dietary requirements.
   * Guest may enter an optional message.
9. If Declined:

   * Menu choices are not displayed or are disabled.
   * Guest may enter an optional message.
10. Guest submits.
11. System validates the submission.
12. System saves the response.
13. System records response source as Guest submitted.
14. System records response timestamp.
15. System displays confirmation screen.

Guests can update responses before the RSVP deadline.

When a guest updates a response:

* Previous active values are replaced.
* Updated timestamp changes.
* Response source remains Guest submitted unless later edited by organiser.
* Menu selections must be revalidated against current active menu courses.

---

## 6.7 Organiser Manual RSVP Editing

An organiser can manually update guest RSVP data for guests on events they own.

Editable response fields:

* RSVP status
* Menu choices
* Dietary requirements
* Guest message or organiser note, depending on final implementation

Recommended MVP decision:

* Include an internal organiser note field separate from the guest-facing message.
* Internal organiser notes are visible only to the organiser.
* Internal organiser notes are included in exports only if explicitly configured.

The system must record:

* That the response was manually edited by the organiser
* The organiser who edited it
* The timestamp of the edit

Manual edit rules:

* Organiser edits must obey the same menu validation rules.
* Accepted guests require menu choices if menu courses exist.
* Declined guests do not require menu choices.
* Organiser cannot edit guests belonging to another organiser’s event.

---

## 6.8 RSVP Deadline Behaviour

Each event has an RSVP deadline.

Before the deadline:

* Guests can submit RSVP responses.
* Guests can update RSVP responses.

After the deadline:

* Guests can still view event details.
* Guests cannot submit a new RSVP.
* Guests cannot update an existing RSVP.
* RSVP form controls are disabled.
* Page shows a deadline-passed message.

Message:

“The RSVP deadline has passed. Please contact the organiser if you need to change your response.”

The organiser can:

* Extend the RSVP deadline
* Reopen the RSVP deadline
* Manually update guest responses after the deadline

Deadline validation:

* Deadline must be stored in a timezone-aware way.
* Event timezone handling must be consistent.

Recommended MVP decision:

* Store event date/time and RSVP deadline using a defined event timezone.
* Default timezone can be configured at application level.
* Do not rely on the server timezone implicitly.

---

## 6.9 Superadmin Behaviour

A superadmin can access a dedicated superadmin area.

The superadmin area must allow:

* Viewing organiser accounts
* Viewing event list across the platform
* Viewing event-level RSVP summaries
* Viewing basic audit information
* Disabling organiser accounts

Superadmin must not be able to:

* Impersonate organisers
* Edit organiser-owned events
* Edit guest RSVP data
* View private RSVP tokens in plain text
* Send invitation emails on behalf of organisers unless explicitly added later

When a superadmin disables an organiser account:

* The organiser can no longer log in.
* The organiser can no longer manage events.
* Public event pages for that organiser should show a generic unavailable message.
* Guest RSVP pages for that organiser should show a generic unavailable message.
* Existing data must not be deleted.

Recommended unavailable message:

“This event is currently unavailable.”

---

## 7. Permissions Matrix

| Capability                      |               Guest |        Event Organiser |             Superadmin |
| ------------------------------- | ------------------: | ---------------------: | ---------------------: |
| Register account                |                  No |                    Yes | No / seeded separately |
| Log in                          |                  No |                    Yes |                    Yes |
| Create event                    |                  No |                    Yes |                     No |
| Edit own event                  |                  No |                    Yes |                     No |
| View public event page          |                 Yes |                    Yes |                Limited |
| View private RSVP page          |       Own link only |           Preview only |                     No |
| Submit RSVP                     | Own invitation only | No, except manual edit |                     No |
| Update RSVP before deadline     | Own invitation only |            Manual edit |                     No |
| Add guests                      |                  No |        Own events only |                     No |
| Remove guests                   |                  No |        Own events only |                     No |
| Send invitation emails          |                  No |        Own guests only |                     No |
| Export PDF                      |                  No |        Own events only |                     No |
| Export CSV                      |                  No |        Own events only |                     No |
| View organiser accounts         |                  No |                     No |                    Yes |
| Disable organiser accounts      |                  No |                     No |                    Yes |
| Edit guest RSVP data            |                  No |        Own events only |                     No |
| View guest dietary requirements |            Own only |        Own events only |           Avoid in MVP |
| Impersonate users               |                  No |                     No |                     No |

---

## 8. Rules & Constraints

## 8.1 Access Control Rules

The system must never:

* Allow an organiser to access events they do not own
* Allow an organiser to export events they do not own
* Allow a guest to access another guest’s RSVP form
* Allow a guest to edit another guest’s RSVP
* Expose another guest’s private RSVP link
* Show guest RSVP data on the public event page
* Make removed guest links usable
* Send guest emails unless explicitly triggered by the organiser
* Reveal sensitive invitation matching information through error messages
* Trust client-side checks for ownership or permissions

All access control must be enforced server-side.

---

## 8.2 Guest Privacy Rules

Guests must not see:

* Other guests’ names
* Other guests’ attendance status
* Total number attending
* Total number declined
* Other guests’ menu choices
* Other guests’ dietary requirements
* Other guests’ messages
* Other guests’ private links

Dietary requirements and allergies must be treated as sensitive personal information.

---

## 8.3 RSVP Rules

Valid RSVP statuses:

* Not Responded
* Accepted
* Declined

Initial guest status:

* Not Responded

Rules:

* Accepted guests must provide required menu selections if menu courses exist.
* Declined guests do not provide menu selections.
* Dietary requirements are optional.
* Guest messages are optional.
* Guests can update responses before the RSVP deadline.
* Guests cannot update responses after the RSVP deadline.
* Organisers can manually update responses after the deadline.

---

## 8.4 Menu Rules

The MVP supports course-based menus only.

Each course must have:

* Name
* Display order
* At least one active option

Each option must have:

* Name
* Display order

Rules:

* Accepted guests choose exactly one option per course.
* Declined guests skip menu selection.
* Existing guest menu selections must not be silently deleted.
* Editing menu options with existing responses must preserve data integrity.

Required hardening:

* Do not hard-delete menu courses or options that are referenced by guest responses.
* Use soft deletion, archiving, or unavailable status.
* Exports must still show the historical option name selected at the time of response, even if the option is later archived.

---

## 8.5 Event Link Rules

Each event must have a unique public link.

Each guest must have a unique private RSVP link.

Guest RSVP tokens must be:

* Long
* Random
* Unguessable
* Unique
* Stored securely

Recommended token approach:

* Use cryptographically secure random tokens.
* Do not use sequential IDs in public URLs.
* Do not expose database IDs where avoidable.

---

## 8.6 Image Rules

Images are optional.

If no image is uploaded, the system must use elegant default placeholders.

Uploaded images must be validated by:

* File type
* File size
* MIME type
* Basic image integrity

Uploaded images must not allow executable content.

The application must not serve uploaded files in a way that allows script execution.

---

## 8.7 Storage Rules

The application must support S3-compatible object storage for uploaded images.

The application must also support local file storage as a fallback or development option.

Rules:

* Storage provider must be configurable by environment variable.
* Uploaded image metadata must be stored in PostgreSQL.
* Local storage must use a persistent volume in production.
* If local storage is used, file backups are required.
* If S3-compatible storage is used, retention and recovery policy must be documented.

---

## 8.8 Backup Rules

PostgreSQL backups are required.

Minimum requirements:

* Automated daily PostgreSQL backups
* Backups retained for at least 14 days
* Restore process documented
* Uploaded images included in backup planning
* Object storage backup or retention policy documented
* Backups should be restorable without manual database surgery

Recommended hardening:

* Backup success/failure should be observable in Coolify or external monitoring.
* A test restore should be performed before production launch.

---

## 9. Error Handling

## 9.1 Wrong Guest Email

If a guest enters an email address that does not match the invitation, show:

“The email address does not match this invitation.”

Rules:

* Do not reveal the correct email address.
* Do not reveal whether the token is valid.
* Allow retry.
* Apply rate limiting to repeated failed attempts.

---

## 9.2 Invalid or Removed Guest Link

If a guest link is invalid, malformed, removed, or unavailable, show:

“This invitation link is no longer valid.”

Rules:

* Do not reveal whether the guest was removed.
* Do not reveal whether the token was wrong.
* Do not reveal whether the event was deleted.
* Do not reveal whether the organiser was disabled.

---

## 9.3 RSVP Deadline Passed

If the RSVP deadline has passed, guests can view event details but cannot submit or update their RSVP.

Show:

“The RSVP deadline has passed. Please contact the organiser if you need to change your response.”

---

## 9.4 Missing Required Menu Choices

If an accepted guest misses a required menu choice, prevent submission.

Example:

“Please choose an option for Main.”

The error should identify the missing course.

---

## 9.5 Upload Errors

If image upload fails, show a clear error.

Possible causes:

* Unsupported file type
* File too large
* Upload failed
* Storage provider unavailable

Rules:

* Do not crash.
* Do not lose already-entered form data where reasonably possible.
* Log upload failures server-side.

---

## 9.6 Export Errors

If PDF or CSV export fails:

* Show a clear organiser-facing error.
* Log the failure internally.
* Allow retry.
* Do not generate partial corrupt files.

---

## 9.7 Email Sending Errors

If an invitation email fails:

* Notify the organiser.
* Keep the guest in the guest list.
* Keep the private RSVP link available for manual sharing.
* Log the failure.
* Do not mark the invite as successfully sent.

---

## 10. Data Model Requirements

The implementation does not need to use these exact table names, but it must support equivalent data.

## 10.1 Users / Accounts

Required fields:

* ID
* Name
* Email
* Password hash
* Role
* Disabled status
* Created timestamp
* Updated timestamp

Roles:

* Organiser
* Superadmin

Rules:

* Email must be unique across organiser/superadmin accounts.
* Passwords must never be stored in plain text.
* Disabled users must not be able to log in.

---

## 10.2 Events

Required fields:

* ID
* Organiser ID
* Public slug or token
* Event name
* Event date
* Start time
* End time
* Timezone
* Location name
* Location address
* Description/details
* RSVP deadline
* Header image reference
* Profile image reference
* Created timestamp
* Updated timestamp
* Disabled/unavailable status, if required

Rules:

* Event belongs to exactly one organiser.
* Public slug/token must be unique.
* Event times must be interpreted consistently using event timezone.

---

## 10.3 Menu Courses

Required fields:

* ID
* Event ID
* Course name
* Display order
* Active/archived status
* Created timestamp
* Updated timestamp

Rules:

* Course belongs to exactly one event.
* Course order must be deterministic.

---

## 10.4 Menu Options

Required fields:

* ID
* Course ID
* Option name
* Display order
* Active/archived status
* Created timestamp
* Updated timestamp

Optional fields:

* Description
* Dietary label

Rules:

* Option belongs to exactly one course.
* Options referenced by responses must not be hard-deleted.

---

## 10.5 Guests

Required fields:

* ID
* Event ID
* Forename
* Surname
* Email
* RSVP token
* RSVP status
* Dietary requirements
* Guest message
* Internal organiser note
* Response source
* Last response timestamp
* Removed/soft-deleted status
* Created timestamp
* Updated timestamp

Rules:

* Guest belongs to exactly one event.
* Guest email should be unique per event among active guests.
* RSVP token must be unique.
* Removed guests must not be visible in normal views or exports.

---

## 10.6 Menu Selections

Required fields:

* ID
* Guest ID
* Course ID
* Selected option ID
* Stored course name snapshot
* Stored option name snapshot
* Created timestamp
* Updated timestamp

Rules:

* Store snapshots of course and option names to preserve export history.
* Accepted guests must have one valid selection per active course.
* Declined guests should not require menu selections.

---

## 10.7 Audit Events

Required fields:

* ID
* Actor type
* Actor ID, where available
* Event type
* Related entity type
* Related entity ID
* Timestamp
* Metadata

Actor types:

* Guest
* Organiser
* Superadmin
* System

Audit event examples:

* Event created
* Event updated
* Guest added
* Guest removed
* Invitation email sent
* Invitation email failed
* RSVP submitted
* RSVP updated
* RSVP manually edited by organiser
* Organiser account disabled
* Export generated
* Password reset requested

---

## 11. Security Requirements

The system must implement:

* Secure password hashing
* Secure session handling
* Server-side access control
* Server-side validation
* CSRF protection where applicable
* Long, cryptographically secure RSVP tokens
* Rate limiting on sensitive endpoints
* Safe file upload validation
* XSS protection
* SQL injection protection through safe database access patterns
* Secure environment variable handling
* HTTPS in production

Sensitive endpoints include:

* Login
* Password reset
* Guest email verification
* RSVP submission
* Image upload
* Exports
* Superadmin pages

Guest RSVP token rules:

* Tokens must not be sequential.
* Tokens must not encode guessable data.
* Tokens must not expose database IDs.
* Tokens must be invalidated when guests are removed.
* Tokens should not be logged in full.

---

## 12. Technical Considerations

## 12.1 Application Type

This is a greenfield application.

The MVP should be implemented as a single full-stack web application.

Preferred framework:

* Next.js

Database:

* PostgreSQL

Deployment:

* Coolify server

---

## 12.2 Architecture

Recommended MVP architecture:

* Next.js full-stack application
* PostgreSQL database
* Server-side authentication
* Server-side validation
* S3-compatible object storage
* Local file storage fallback
* Transactional email provider abstraction
* PDF generation module
* CSV generation module
* Audit logging module
* Superadmin module

---

## 12.3 Deployment Requirements

The application must be deployable through Coolify.

Deployment must use:

* Environment variables for secrets
* HTTPS
* PostgreSQL connection configuration
* Email provider configuration
* Object storage configuration
* Database migrations
* Persistent storage configuration where needed

Secrets must not be hardcoded.

Recommended environment variables:

* Database URL
* App base URL
* Session secret
* Email provider settings
* Object storage endpoint
* Object storage bucket
* Object storage access key
* Object storage secret key
* Storage driver
* Default timezone

---

## 12.4 Email Provider

The transactional email provider is undecided.

The implementation must support a provider abstraction.

Required email types:

* Invitation email
* Password reset email

Out of scope:

* Guest RSVP confirmation emails
* Automated reminder emails
* Event update notification emails
* Marketing emails

---

## 12.5 Object Storage

Preferred storage:

* S3-compatible object storage

Fallback:

* Local file storage

Rules:

* Storage driver must be configurable.
* File references must be stored in the database.
* Production local storage must use persistent volumes.
* Uploaded files must not be lost between deployments.
* File backup/restore must be documented.

---

## 12.6 Database Backups

Backup requirements:

* Automated daily PostgreSQL backups
* Minimum 14-day retention
* Restore process documented
* Uploaded image backup strategy documented
* Backup failures must be visible to the operator

---

## 13. Design Requirements

The design must be simple, elegant, and baby-shower appropriate.

Design rules:

* Soft pastel colour palette
* Clean typography
* Rounded cards
* Generous spacing
* No default Bootstrap appearance
* Mobile-first layouts
* App-like behaviour on mobile
* Large touch targets
* Minimal clutter
* Clear primary actions
* Elegant default image placeholders

The UI must feel polished from the first version.

Avoid:

* Generic admin dashboard appearance
* Dense tables on mobile
* Default Bootstrap styling
* Overly corporate visual language
* Cluttered forms
* Tiny tap targets

---

## 14. Responsive Behaviour

Desktop:

* Dashboard and event management pages may use tabs.
* Tables may be used where appropriate.
* Export and management actions should be easy to access.

Mobile:

* Event management sections should stack vertically.
* Guest RSVP flow should be optimised first for mobile.
* Touch targets should be large.
* Forms should be easy to complete on a phone.
* Organiser dashboard should feel app-like.
* Primary actions should remain easy to reach.

---

## 15. Acceptance Criteria

## 15.1 Organiser Account

* Given a new organiser, when they register with valid details, then an organiser account is created.
* Given a registered organiser, when they log in with valid credentials, then they can access their dashboard.
* Given a registered organiser, when they request a password reset, then they can reset their password using a secure reset flow.
* Given an unauthenticated user, when they try to access organiser pages, then they are redirected or denied access.
* Given a disabled organiser, when they try to log in, then access is denied.

---

## 15.2 Event Creation

* Given a logged-in organiser, when they create an event with required fields, then the event is saved and appears in their dashboard.
* Given an event is created, then the system generates a unique public event link.
* Given an organiser has multiple events, then all owned events appear in their dashboard.
* Given one organiser owns an event, another organiser must not be able to access or edit it.
* Given a start time after the end time, the event cannot be saved.
* Given an RSVP deadline after the event date, the event cannot be saved.

---

## 15.3 Event Editing

* Given an organiser edits event details, when they save changes, then the public event page reflects the updates.
* Given an event has been updated, when a guest views the guest page, then a last updated notice is shown.
* Given an organiser uploads a valid JPG, PNG, or WebP under 5MB, then the image is accepted.
* Given an organiser uploads an unsupported or oversized image, then the upload is rejected with a clear error.
* Given an organiser attempts to edit another organiser’s event, access is denied.

---

## 15.4 Menu Management

* Given an organiser creates menu courses and options, then accepted guests must choose one option per course.
* Given an event has no menu courses, then the guest RSVP flow does not ask for menu choices.
* Given a guest declines, then menu choices are not required.
* Given a menu option already has guest selections, editing or deleting it must not silently corrupt existing RSVP data.
* Given a selected menu option is archived, exports still show the historical selected option name.

---

## 15.5 Guest Management

* Given an organiser adds a guest with forename, surname, and email, then the guest is added to the event.
* Given a guest is added, then the system generates a unique private RSVP link.
* Given a duplicate guest email is added to the same event, then the system prevents the duplicate.
* Given a guest is removed, then their private RSVP link no longer works.
* Given a guest is removed, then they are excluded from normal PDF and CSV exports.

---

## 15.6 Invitation Sharing

* Given an organiser views a guest, then they can copy that guest’s private RSVP link.
* Given an organiser explicitly triggers an invitation email, then the system attempts to send the email.
* Given an invitation email fails, then the organiser is notified and the guest link remains available for manual sharing.
* The system must not send invitation emails unless explicitly triggered by the organiser.
* Invitation emails must not expose any other guest details.

---

## 15.7 Guest RSVP

* Given a guest opens a valid private RSVP link, then they can view event details.
* Given a guest enters the correct email address, then they can access the RSVP form.
* Given a guest enters the wrong email address, then they see a generic mismatch error.
* Given a guest accepts, then they must complete required menu selections if menu courses exist.
* Given a guest accepts, then they may enter dietary requirements.
* Given a guest accepts or declines, then they may enter an optional message.
* Given a guest submits a valid RSVP, then the response is saved.
* Given a guest revisits their link before the RSVP deadline, then they can update their response.
* Given a guest attempts to access another guest’s response, then access is denied.

---

## 15.8 RSVP Deadline

* Given the RSVP deadline has passed, guests can still view event details.
* Given the RSVP deadline has passed, guests cannot submit a new RSVP.
* Given the RSVP deadline has passed, guests cannot update an existing RSVP.
* Given the RSVP deadline has passed, the guest page tells the guest to contact the organiser.
* Given an organiser extends or reopens the RSVP deadline, guests can submit or update responses again.

---

## 15.9 Organiser RSVP Overview

* Given guests have responded, the organiser can see accepted, declined, and not responded counts.
* Given an organiser opens an event, they can view all active invited guests.
* Given an organiser manually updates a guest response, the system records that the response was organiser-edited.
* Given a guest submits their own response, the system records that the response was guest-submitted.
* Given an organiser views responses, removed guests are not shown by default.

---

## 15.10 Public Event Page

* Given a public event link is opened, the event details are shown.
* Given a public event page is opened, no guest names are shown.
* Given a public event page is opened, no RSVP counts are shown.
* Given a public event page is opened, no dietary requirements or menu selections are shown.
* Public event pages include noindex metadata.
* Public event pages are not included in a public directory or sitemap.

---

## 15.11 PDF Export

* Given an organiser requests a PDF export, the system generates a PDF for that event.
* The PDF includes event details, RSVP counts, and all active invited guests.
* The PDF includes each guest’s RSVP status, menu choices, dietary requirements, optional message, last response timestamp, and response source.
* Removed guests are excluded from the standard PDF export.
* Given an organiser attempts to export another organiser’s event, access is denied.

---

## 15.12 CSV Export

* Given an organiser requests a CSV export, the system generates a CSV for that event.
* The CSV includes all active invited guests.
* The CSV includes guest details, RSVP status, menu choices, dietary requirements, optional message, last response timestamp, and response source.
* Removed guests are excluded from the standard CSV export.
* CSV values are safely escaped.
* CSV is readable in common spreadsheet tools.

---

## 15.13 Superadmin

* Given a superadmin logs in, they can access the superadmin area.
* Given a superadmin views the platform, they can see organiser accounts.
* Given a superadmin views events, they can see event-level RSVP summaries.
* Given a superadmin disables an organiser account, that organiser can no longer log in.
* Given an organiser account is disabled, their event and guest pages show a generic unavailable message.
* Superadmin impersonation is not available in MVP.
* Superadmin editing of guest RSVP data is not available in MVP.

---

## 15.14 Backups

* PostgreSQL backups run automatically every day.
* Backups are retained for at least 14 days.
* A restore process is documented.
* Uploaded images are included in backup planning.
* If local file storage is used, uploaded files are included in the backup process.
* If S3-compatible storage is used, the storage retention or backup policy is documented.
* Backup failure is visible to the operator.
* A test restore is completed before production launch.

---

## 16. Non-Goals

The MVP does not include:

* Multiple organisers per event
* Group invitations
* Plus-ones
* Event duplication
* Ticket sales
* Paid events
* Seating plans
* QR code check-in
* Calendar sync
* SMS invites
* WhatsApp invites
* Automated reminder emails
* Guest confirmation emails after RSVP
* Guest accounts
* Public attendee lists
* Public event directory
* Analytics dashboards
* RSVP conversion tracking
* Superadmin impersonation
* Superadmin editing of guest RSVP data
* Native iOS or Android apps
* Address autocomplete
* Map integration
* Marketing email campaigns

---

## 17. Remaining Open Questions

These questions should be answered before implementation starts, but they do not block the overall MVP shape.

1. Which transactional email provider will be used?
2. Should organiser email verification be added after MVP?
3. Should invitation emails allow organiser-customised text in MVP?
4. Should internal organiser notes appear in exports by default?
5. Should public event links use random tokens only, or human-readable slugs plus random suffix?
6. What exact timezone should be used as the default for newly created events?
7. Should event profile/header placeholders be fixed defaults or selected from a small preset library?

---

## 18. Recommended Build Sequence

Build in this order:

1. Project setup and deployment baseline
2. PostgreSQL schema and migrations
3. Organiser authentication
4. Event creation and editing
5. Public event page
6. Guest creation and RSVP token generation
7. Private RSVP page with email verification
8. RSVP submission and update flow
9. Course-based menu management
10. Organiser response dashboard
11. Manual RSVP editing
12. PDF export
13. CSV export
14. Invitation email support
15. Password reset email support
16. Superadmin area
17. Object storage integration
18. Backup and restore documentation
19. UI polish and mobile optimisation
20. Security hardening and acceptance testing

---

## 19. AI-Agent Implementation Guardrails

An AI coding agent must not:

* Add out-of-scope features without approval.
* Replace the selected stack without approval.
* Introduce guest accounts.
* Add plus-one support.
* Add payment or ticketing.
* Add analytics dashboards.
* Make event pages publicly searchable.
* Expose guest data on public pages.
* Use hardcoded secrets.
* Store passwords in plain text.
* Use sequential invitation IDs in public URLs.
* Skip server-side permission checks.
* Assume Bootstrap styling is acceptable.
* Ignore mobile-first guest RSVP design.
* Build only desktop-first screens.
* Hard-delete menu options that are referenced by responses.
* Hard-delete guests by default.
* Couple email sending to one provider with no abstraction.
* Store uploaded files in a non-persistent location in production.

## Addendum: Guest Messages & Keepsake PDF

### Purpose

Guests should be able to leave an optional message for the event organiser or parent-to-be when they RSVP.

At the end of the event, the organiser should be able to download all guest messages as a nicely formatted PDF document.

This PDF is separate from the operational RSVP export PDF.

---

## Guest Message Behaviour

When a guest submits an RSVP, they may optionally leave a personal message.

The message field should be available whether the guest accepts or declines.

The message should be presented as a warm, personal prompt suitable for a baby shower.

Example prompt:

“Leave a message for the parent-to-be”

The message field is optional.

Guests can update their message using their private RSVP link until the RSVP deadline has passed.

The message should be visible to the organiser inside the event management area.

---

## Message PDF Export

The organiser must be able to download a dedicated messages PDF for each event.

This PDF should be designed as a polished keepsake, not just a data table.

The messages PDF should include:

* Event name
* Event date
* Optional event image or decorative header
* A title such as “Messages from Your Guests”
* Guest messages grouped or listed elegantly
* Guest name with each message
* Optional RSVP status per message, if useful
* Export generation date

The messages PDF should exclude guests who did not leave a message.

Removed guests should be excluded from the normal messages PDF.

---

## Message PDF Design Requirements

The message PDF should feel suitable for saving or printing.

Design direction:

* Soft baby-shower-friendly styling
* Elegant typography
* Generous spacing
* Card-style message blocks
* Subtle decorative elements
* Clear guest names
* No spreadsheet-style layout
* No operational RSVP counts unless explicitly requested

The PDF should be readable and attractive when printed.

---

## Message Privacy Rules

Guest messages are private to:

* The event organiser
* Permitted internal system access, where required for support or maintenance

Guest messages must not appear on:

* The public event page
* Other guests’ RSVP pages
* Invitation emails
* Public links

Superadmins should not view message contents in MVP unless a specific support-access workflow is added later.

---

## Message Export Rules

The organiser can export:

1. Operational RSVP PDF
2. CSV RSVP export
3. Keepsake messages PDF

The keepsake messages PDF is separate from the operational RSVP PDF.

The operational RSVP PDF may still include guest messages if needed for planning, but the keepsake PDF should be optimised for presentation and printing.

Recommended hardened decision:

* Operational RSVP PDF includes messages in a table for organiser reference.
* Keepsake messages PDF includes only guests who left messages and is styled for presentation.

---

## Acceptance Criteria

* Given a guest is submitting an RSVP, they can optionally leave a message.
* Given a guest accepts, they can leave a message.
* Given a guest declines, they can still leave a message.
* Given a guest revisits their RSVP link before the deadline, they can update their message.
* Given the RSVP deadline has passed, the guest can view event details but cannot update their message.
* Given an organiser views event responses, they can see guest messages.
* Given an organiser downloads the operational RSVP PDF, guest messages are included for planning reference.
* Given an organiser downloads the messages PDF, only guests with messages are included.
* Given a guest did not leave a message, they are excluded from the messages PDF.
* Given a removed guest left a message, they are excluded from the normal messages PDF.
* Given the messages PDF is generated, it uses a polished keepsake-style design rather than a plain table.
* Guest messages must not appear on the public event page.
* Guest messages must not be visible to other guests.


Any deviation from this specification must be raised as an explicit implementation question before being built.
