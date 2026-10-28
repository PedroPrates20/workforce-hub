import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

declare const process: { env: Record<string, string | undefined> };

const emailPayload = z.object({
  to: z.string().email().max(254),
  subject: z.string().trim().min(1).max(180),
  html: z.string().min(1).max(250_000),
  text: z.string().max(60_000),
});

export const sendRosterEmail = createServerFn({ method: "POST" })
  .validator((value: unknown) => emailPayload.parse(value))
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const allowedDomains = (process.env.ROSTER_EMAIL_ALLOWED_DOMAINS ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);

    if (!apiKey || !from || allowedDomains.length === 0) {
      return { ok: false, reason: "not_configured" };
    }

    const recipientDomain = data.to.split("@").at(-1)?.toLowerCase();
    if (!recipientDomain || !allowedDomains.includes(recipientDomain)) {
      return { ok: false, reason: "recipient_not_allowed" };
    }

    // The app provides React-rendered inline HTML. Reject active markup if a
    // client tries to bypass the preview and submit unrelated email content.
    const lowerHtml = data.html.toLowerCase();
    if (
      lowerHtml.includes("<script") ||
      lowerHtml.includes("<iframe") ||
      lowerHtml.includes("<object") ||
      lowerHtml.includes("<embed") ||
      lowerHtml.includes("javascript:")
    ) {
      return { ok: false, reason: "invalid_content" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [data.to],
          subject: data.subject,
          html:
            '<!doctype html><html><body style="margin:0;font-family:Arial,Helvetica,sans-serif">' +
            data.html +
            "</body></html>",
          text: data.text,
        }),
      });

      if (!response.ok) {
        console.error("Roster email provider returned status", response.status);
        return { ok: false, reason: "provider_error" };
      }

      return { ok: true };
    } catch (error) {
      console.error("Roster email provider request failed", error);
      return { ok: false, reason: "provider_error" };
    }
  });
