
'use server';

/**
 * @fileOverview Detects a calendar event from a document image or text.
 *
 * - detectEvent - A function that takes document content and returns event details.
 * - DetectEventInput - The input type for the detectEvent function.
 * - DetectEventOutput - The return type for the detectEvent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DetectEventOutputSchema } from '../schemas';

const DetectEventInputSchema = z.object({
  photoDataUri: z.optional(z
    .string()
    .describe(
      "A photo of the document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    )
  ),
  textContent: z.optional(z.string().describe("The text content of the document.")),
});
export type DetectEventInput = z.infer<typeof DetectEventInputSchema>;
export type DetectEventOutput = z.infer<typeof DetectEventOutputSchema>;


export async function detectEvent(input: DetectEventInput): Promise<DetectEventOutput> {
  return detectEventFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectEventPrompt',
  input: {schema: DetectEventInputSchema},
  output: {schema: DetectEventOutputSchema},
  prompt: `You are an AI assistant that specializes in finding calendar events, tasks, or appointments within documents and summarizing them concisely. You are particularly skilled at identifying due dates on bills, invoices, and official notices.

Analyze the document content provided below (either as an image or as text). Your goal is to identify a single, primary event, bill, or task and extract only its key details.

- If an event is found (like an appointment, a bill due date, or a registration renewal), you MUST extract its details:
  - title: A very short, clear title for the event (e.g., "Vehicle Registration Renewal", "Invoice #123 Due", "Doctor's Appointment"). MAXIMUM 5 WORDS.
  - startDate: The primary date or due date for the event. This is a mandatory field if an event is found. Look for keywords like "Due Date", "Payment Due", or "Date".
  - endDate: The end date, if a range is specified. Otherwise, leave empty.
  - location: The physical address or relevant place for the event.
  - description: A brief, one-sentence summary of the event's purpose. Include the amount due if it's a bill.
- Dates and times must be in a machine-readable format (YYYY-MM-DDTHH:mm:ss). 
- **CRITICAL RULE**: If a date in the document does not specify a year (e.g., "August 23rd", "10/08"), you MUST assume it is for the current year. Do not use a past year unless it is explicitly written in the document.
- If no specific event, task, or appointment with a clear date is found, you MUST set the 'found' property to false and leave all other fields empty. Do not invent an event.
- Do NOT include the full text of the document in any field. Summarize and extract only the essential information.

Document Image: {{#if photoDataUri}}{{media url=photoDataUri}}{{/if}}
Document Text:
---
{{textContent}}
---

Your response MUST be a valid JSON object conforming to the specified output schema.
`,
});

const detectEventFlow = ai.defineFlow(
  {
    name: 'detectEventFlow',
    inputSchema: DetectEventInputSchema,
    outputSchema: DetectEventOutputSchema,
  },
  async input => {
    if (!input.photoDataUri && !input.textContent) {
      return { found: false };
    }
    const {output} = await prompt(input);
    // If the model can't find a title or a start date, it's not a valid event.
    if (!output || !output.title || !output.startDate) {
      return { found: false };
    }
    // Also mark as not found if the model hallucinates a placeholder.
    if (output.title.toLowerCase().includes('no event found')) {
      return { found: false };
    }

    return {...output, found: true};
  }
);
