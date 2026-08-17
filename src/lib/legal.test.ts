import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The privacy notice has to describe the deployment it is actually served
 * from. These cover the two things it derives rather than states: whether the
 * operator has identified themselves, and which providers see the data.
 *
 * `env.ts` parses `process.env` once at import, so each case stubs the
 * environment and re-imports the module rather than mutating a live value.
 */

async function loadLegal(environment: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(environment)) {
    vi.stubEnv(key, value);
  }
  return import("./legal");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("operator configuration", () => {
  it("is unconfigured when the deployer has set nothing", async () => {
    const { operatorConfigured } = await loadLegal({
      LEGAL_ENTITY_NAME: "",
      LEGAL_CONTACT_EMAIL: "",
    });

    expect(operatorConfigured).toBe(false);
  });

  it("is still unconfigured with a name but no way to reach them", async () => {
    // A controller nobody can contact cannot honour a data subject request,
    // so a name on its own is not enough to stop warning.
    const { operatorConfigured } = await loadLegal({
      LEGAL_ENTITY_NAME: "Owl Media Ltd",
      LEGAL_CONTACT_EMAIL: "",
    });

    expect(operatorConfigured).toBe(false);
  });

  it("is configured once both are present", async () => {
    const { operatorConfigured, operator } = await loadLegal({
      LEGAL_ENTITY_NAME: "Owl Media Ltd",
      LEGAL_CONTACT_EMAIL: "privacy@example.com",
    });

    expect(operatorConfigured).toBe(true);
    expect(operator.name).toBe("Owl Media Ltd");
  });
});

describe("recipient categories (GDPR Art. 13(1)(e))", () => {
  it("lists only the host when nothing leaves the server", async () => {
    const { recipientCategories } = await loadLegal({
      EMAIL_DRIVER: "console",
      STORAGE_DRIVER: "local",
    });

    expect(recipientCategories().map((recipient) => recipient.category)).toEqual([
      "Hosting provider",
    ]);
  });

  it("names Resend when it is the configured mailer", async () => {
    const { recipientCategories } = await loadLegal({
      EMAIL_DRIVER: "resend",
      RESEND_API_KEY: "re_test_key",
      STORAGE_DRIVER: "local",
    });

    expect(recipientCategories().map((recipient) => recipient.category)).toContain(
      "Resend (email delivery)",
    );
  });

  it("describes an SMTP mailer by category rather than by hostname", async () => {
    const { recipientCategories } = await loadLegal({
      EMAIL_DRIVER: "smtp",
      SMTP_HOST: "smtp.internal.example.com",
      STORAGE_DRIVER: "local",
    });

    const categories = recipientCategories().map((recipient) => recipient.category);

    expect(categories).toContain("Email delivery provider");
    // Publishing the configured host would expose infrastructure for no legal
    // gain; Art. 13(1)(e) is satisfied by the category.
    expect(categories.join(" ")).not.toContain("smtp.internal.example.com");
  });

  it("adds object storage only when uploads leave the server", async () => {
    const { recipientCategories } = await loadLegal({
      EMAIL_DRIVER: "console",
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "gathered",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
    });

    expect(recipientCategories().map((recipient) => recipient.category)).toContain(
      "Object storage provider",
    );
  });
});

describe("retention statement", () => {
  it("states the honest default when the deployer sets none", async () => {
    const { retentionStatement } = await loadLegal({ LEGAL_RETENTION_STATEMENT: "" });

    // Gathered deletes nothing on a timer, so the default must not imply it.
    expect(retentionStatement()).toContain("not deleted automatically");
  });

  it("uses the deployer's wording when given", async () => {
    const { retentionStatement } = await loadLegal({
      LEGAL_RETENTION_STATEMENT: "We delete events 90 days after they finish.",
    });

    expect(retentionStatement()).toBe("We delete events 90 days after they finish.");
  });
});
