import "server-only";
import type { Event, RsvpStatus } from "@/db/schema";
import { getEventCounts, type RsvpCounts } from "@/lib/data/events";
import { listGuestsWithSelections } from "@/lib/data/guests";
import { listMenuForOrganiser } from "@/lib/data/menu";
import { responseSourceLabel } from "@/lib/rsvp";
import { fullName } from "@/lib/text";
import { env } from "@/lib/env";
import { eventHasPayment, formatMoney, paymentSummary } from "@/lib/money";
import { paymentLabel, paymentStateOf } from "@/components/ui/payment-pill";
import { statusLabelFor } from "./labels";

/**
 * Shared dataset for all three exports (Spec 5.5, 5.6, Addendum).
 *
 * Built once so the operational PDF, the CSV and the keepsake PDF can never
 * disagree about who is attending or what they chose. Removed guests are
 * excluded here, in one place, which is what Spec 5.5/5.6 require of the
 * standard exports.
 */

export interface ExportSelection {
  courseId: string;
  course: string;
  option: string;
}

export interface ExportGuest {
  id: string;
  forename: string;
  surname: string;
  fullName: string;
  email: string;
  status: RsvpStatus;
  statusLabel: string;
  responseSource: string;
  lastResponseAt: Date | null;
  lastResponseLabel: string;
  dietaryRequirements: string;
  guestMessage: string;
  organiserNote: string;
  /** Empty on events that ask guests for no contribution. */
  paymentLabel: string;
  depositPaidAt: Date | null;
  paidInFullAt: Date | null;
  selections: ExportSelection[];
  /** courseId -> chosen option name, for CSV's per-course columns. */
  selectionByCourse: Record<string, string>;
}

export interface ExportCourseColumn {
  id: string;
  name: string;
  archived: boolean;
}

export interface ExportPaymentTotals {
  depositLabel: string | null;
  totalLabel: string | null;
  paidInFull: number;
  depositOnly: number;
  unpaid: number;
}

export interface ExportDataset {
  event: Event;
  counts: RsvpCounts;
  guests: ExportGuest[];
  /** Course columns in display order, including archived ones still in use. */
  courseColumns: ExportCourseColumn[];
  /** Null when the event asks guests for no contribution. */
  payment: ExportPaymentTotals | null;
  generatedAt: Date;
}

export async function buildExportDataset(event: Event): Promise<ExportDataset> {
  const [guestRows, allCourses, counts] = await Promise.all([
    listGuestsWithSelections(event.id),
    listMenuForOrganiser(event.id),
    getEventCounts(event.id),
  ]);

  const eventAsksForMoney = eventHasPayment(event.totalAmountMinor, event.depositAmountMinor);

  const guests: ExportGuest[] = guestRows.map((guest) => {
    const selections: ExportSelection[] = guest.selections.map((selection) => ({
      courseId: selection.courseId,
      /**
       * Snapshots taken when the guest chose, not the current names. An option
       * renamed or archived afterwards still exports as what was actually
       * selected (Spec 8.4 "Required hardening", 15.4).
       */
      course: selection.courseNameSnapshot,
      option: selection.optionNameSnapshot,
    }));

    const selectionByCourse: Record<string, string> = {};
    for (const selection of selections) {
      selectionByCourse[selection.courseId] = selection.option;
    }

    return {
      id: guest.id,
      forename: guest.forename,
      surname: guest.surname,
      fullName: fullName(guest.forename, guest.surname),
      email: guest.email,
      status: guest.rsvpStatus,
      statusLabel: statusLabelFor(guest.rsvpStatus),
      responseSource: responseSourceLabel(guest.responseSource),
      lastResponseAt: guest.lastResponseAt,
      lastResponseLabel: guest.lastResponseAt
        ? guest.lastResponseAt.toISOString()
        : "",
      dietaryRequirements: guest.dietaryRequirements ?? "",
      guestMessage: guest.guestMessage ?? "",
      organiserNote: guest.organiserNote ?? "",
      paymentLabel: eventAsksForMoney
        ? paymentLabel(paymentStateOf(guest.depositPaidAt, guest.paidInFullAt))
        : "",
      depositPaidAt: guest.depositPaidAt,
      paidInFullAt: guest.paidInFullAt,
      selections,
      selectionByCourse,
    };
  });

  /**
   * Columns cover every active course, plus any archived course a guest has
   * actually chosen from. Dropping those would lose data the spec requires
   * exports to retain.
   */
  const referencedCourseIds = new Set(
    guests.flatMap((guest) => guest.selections.map((selection) => selection.courseId)),
  );

  const courseColumns: ExportCourseColumn[] = allCourses
    .filter((course) => course.archivedAt === null || referencedCourseIds.has(course.id))
    .map((course) => ({
      id: course.id,
      name: course.name,
      archived: course.archivedAt !== null,
    }));

  const summary = paymentSummary(event.totalAmountMinor, event.depositAmountMinor);
  const currency = env.DEFAULT_CURRENCY;

  const payment: ExportPaymentTotals | null = eventAsksForMoney
    ? {
        depositLabel:
          summary.deposit !== null ? formatMoney(summary.deposit, currency) : null,
        totalLabel: summary.total !== null ? formatMoney(summary.total, currency) : null,
        paidInFull: guests.filter((guest) => guest.paidInFullAt !== null).length,
        depositOnly: guests.filter(
          (guest) => guest.paidInFullAt === null && guest.depositPaidAt !== null,
        ).length,
        unpaid: guests.filter(
          (guest) => guest.paidInFullAt === null && guest.depositPaidAt === null,
        ).length,
      }
    : null;

  return { event, counts, guests, courseColumns, payment, generatedAt: new Date() };
}

/** Guests grouped by status, in the order the PDF presents them (Spec 5.5). */
export function groupByStatus(guests: ExportGuest[]): {
  status: RsvpStatus;
  label: string;
  guests: ExportGuest[];
}[] {
  const order: RsvpStatus[] = ["accepted", "declined", "not_responded"];
  return order.map((status) => ({
    status,
    label: statusLabelFor(status),
    guests: guests.filter((guest) => guest.status === status),
  }));
}

/** Only guests who actually left a message (Addendum, keepsake PDF). */
export function guestsWithMessages(guests: ExportGuest[]): ExportGuest[] {
  return guests.filter((guest) => guest.guestMessage.trim().length > 0);
}
