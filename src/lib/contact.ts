import { z } from "zod";
import { Resend } from "resend";
import { getSupabase } from "@/lib/supabase";

export const ContactFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100, "Le nom est trop long"),
  email: z.string().email("Email invalide").max(255, "Email trop long"),
  message: z
    .string()
    .min(1, "Le message est requis")
    .max(5000, "Le message est trop long"),
});

export type ContactFormInput = z.infer<typeof ContactFormSchema>;

export type ContactSuccess = {
  success: true;
  emailId: string;
  recordId: string;
};

export type ContactFailure = {
  success: false;
  error: string;
  code:
    | "VALIDATION_ERROR"
    | "CONFIG_ERROR"
    | "RESEND_ERROR"
    | "SUPABASE_ERROR"
    | "UNKNOWN_ERROR";
};

export type ContactResult = ContactSuccess | ContactFailure;

function getRequiredEnvVar(name: string): string {
  const nodeValue =
    typeof process !== "undefined" ? process.env[name] : undefined;
  const viteValue =
    typeof import.meta.env !== "undefined"
      ? (import.meta.env as Record<string, string | undefined>)[name]
      : undefined;

  const value = nodeValue ?? viteValue;

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createResendClient(): Resend {
  const apiKey = getRequiredEnvVar("RESEND_API_KEY");
  return new Resend(apiKey);
}

export async function sendContactEmail(
  input: ContactFormInput
): Promise<{ id: string } | { error: string }> {
  try {
    const resend = createResendClient();
    const { data, error } = await resend.emails.send({
      from: "Contact <contact@guyboireau.com>",
      to: ["guy@guyboireau.com"],
      subject: `Nouveau message de ${input.name}`,
      text: `De: ${input.name} <${input.email}>\n\n${input.message}`,
      reply_to: input.email,
    });

    if (error) {
      console.error("Resend API error:", error);
      return { error: error.message };
    }

    if (!data?.id) {
      return { error: "Resend did not return an email ID" };
    }

    return { id: data.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error while sending email";
    console.error("sendContactEmail exception:", message);
    return { error: message };
  }
}

export async function saveContactMessage(
  input: ContactFormInput
): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        name: input.name,
        email: input.email,
        message: input.message,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return { error: error.message };
    }

    if (!data?.id) {
      return { error: "Supabase did not return a record ID" };
    }

    return { id: data.id };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error while saving to database";
    console.error("saveContactMessage exception:", message);
    return { error: message };
  }
}

export async function processContactForm(
  rawData: unknown
): Promise<ContactResult> {
  const validation = ContactFormSchema.safeParse(rawData);
  if (!validation.success) {
    const issues = validation.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    return {
      success: false,
      error: `Validation échouée: ${issues}`,
      code: "VALIDATION_ERROR",
    };
  }

  const input = validation.data;

  const dbResult = await saveContactMessage(input);
  if ("error" in dbResult) {
    return {
      success: false,
      error: dbResult.error,
      code: "SUPABASE_ERROR",
    };
  }

  const emailResult = await sendContactEmail(input);
  if ("error" in emailResult) {
    return {
      success: false,
      error: emailResult.error,
      code: "RESEND_ERROR",
    };
  }

  return {
    success: true,
    emailId: emailResult.id,
    recordId: dbResult.id,
  };
}