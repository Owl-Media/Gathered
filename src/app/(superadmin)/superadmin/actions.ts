"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AuthorisationError, requireSuperadminForAction } from "@/lib/auth/guards";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { getOrganiserAccount } from "@/lib/data/superadmin";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { type ActionState, failure, formString, success } from "@/lib/forms";

/**
 * Superadmin actions (Spec 6.9, 15.13).
 *
 * Enabling and disabling organiser accounts is the *only* mutation a superadmin
 * can perform. There is deliberately no action here to impersonate an
 * organiser, edit an event, edit guest RSVP data, or send invitations.
 * Spec 6.9 forbids all four in the MVP, so no such code path exists.
 */

const idSchema = z.uuid();

async function setDisabled(formData: FormData, disable: boolean): Promise<ActionState> {
  let superadminId: string;
  try {
    superadminId = (await requireSuperadminForAction()).id;
  } catch (error) {
    return failure(error instanceof AuthorisationError ? error.message : "Something went wrong.");
  }

  const parsed = idSchema.safeParse(formString(formData, "userId"));
  if (!parsed.success) return failure("That account could not be found.");

  // Restricted to role = organiser, so one superadmin cannot disable another.
  const account = await getOrganiserAccount(parsed.data);
  if (!account) return failure("That account could not be found.");

  await db
    .update(users)
    .set({ disabledAt: disable ? new Date() : null, disabledByUserId: disable ? superadminId : null, updatedAt: new Date() })
    .where(eq(users.id, account.id));

  if (disable) {
    // Spec 6.9."The organiser can no longer log in." Dropping their sessions
    // makes that immediate rather than waiting for a cookie to expire.
    await destroyAllSessionsForUser(account.id);
  }

  await recordAudit({
    actorType: "superadmin",
    actorId: superadminId,
    eventType: disable
      ? AUDIT_EVENT.ORGANISER_ACCOUNT_DISABLED
      : AUDIT_EVENT.ORGANISER_ACCOUNT_ENABLED,
    entityType: "user",
    entityId: account.id,
  });

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/events");
  // Public event and guest RSVP pages must immediately show (or stop showing)
  // the generic unavailable message.
  revalidatePath("/e", "layout");
  revalidatePath("/rsvp", "layout");

  return success(
    disable
      ? `${account.name}'s account has been disabled. Their data is unchanged.`
      : `${account.name}'s account has been re-enabled.`,
  );
}

export async function disableOrganiserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setDisabled(formData, true);
}

export async function enableOrganiserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setDisabled(formData, false);
}
