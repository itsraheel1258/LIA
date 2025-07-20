'use server';

/**
 * @fileOverview Suggests relevant folder tags for a document image.
 * Currently, it analyzes the OCRed text and the image to suggest tags.
 *
 * - suggestTags - A function that suggests folder tags for a given document image.
 * - SuggestTagsInput - The input type for the suggestTags function.
 * - SuggestTagsOutput - The return type for the suggestTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTagsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  ocrText: z.string().describe('The OCRed text content of the document.'),
});
export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

const SuggestTagsOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of suggested folder tags.'),
});
export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  return suggestTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTagsPrompt',
  input: {schema: SuggestTagsInputSchema},
  output: {schema: SuggestTagsOutputSchema},
  prompt: `You are an AI assistant that suggests folder tags for documents.

  Analyze the following document content and suggest relevant folder tags.
  The tags should be short, descriptive, and reflect the document's content and category.  Use a hierarchical structure for tags where appropriate (e.g., "Finance > Banking", "Healthcare > Insurance").

  Document Content:
  {{ocrText}}

  Photo: {{media url=photoDataUri}}

  Return an array of suggested folder tags.
  `,
});

const suggestTagsFlow = ai.defineFlow(
  {
    name: 'suggestTagsFlow',
    inputSchema: SuggestTagsInputSchema,
    outputSchema: SuggestTagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
