import { z } from "genkit";
import { EventSchema } from "./eventSchema";

export const DetectEventInputSchema = z.object({
    photoDataUri: z.optional(z
      .string()
      .describe(
        "A photo of the document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
      )
    ),
    textContent: z.optional(z.string().describe("The text content of the document.")),
  });

  export const DetectEventOutputSchema = z.object({
    events: z.array(EventSchema),
  });