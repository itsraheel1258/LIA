
'use server';

/**
 * @fileOverview Extracts text from a document.
 *
 * - extractText - A function that takes a document and returns the text content.
 * - ExtractTextInput - The input type for the extractText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTextInputSchema = z.object({
  dataUri: z
    .string()
    .describe(
      "A document file (image or PDF) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextInput = z.infer<typeof ExtractTextInputSchema>;


export async function extractText(input: ExtractTextInput): Promise<string> {
    const llmResponse = await ai.generate({
        prompt: [{text: "Extract the text from this document"}, {media: {url: input.dataUri}}],
    });
  
  return llmResponse.text;
}
