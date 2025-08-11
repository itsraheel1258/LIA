
'use server';

/**
 * @fileOverview Generates a preview image for a document based on its summary.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';


const GeneratePreviewInputSchema = z.object({
  summary: z.string().describe("A concise summary of the document's content."),
});
export type GeneratePreviewInput = z.infer<typeof GeneratePreviewInputSchema>;


export async function generatePreview(input: GeneratePreviewInput): Promise<string> {
    const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `
Generate a visually appealing and contextually relevant thumbnail image that represents the following document summary.
The image should be simple, professional, and suitable for a document management system. Avoid text and complex scenes. Focus on creating a clean, symbolic representation.
For example, for a document about a car insurance policy, a simple icon of a car and a shield would be appropriate.
For an invoice, a simple icon of a receipt or a dollar sign.
For a medical document, a simple icon of a stethoscope or a medical cross.
For a contract, a simple icon of a signed document or a handshake.

Summary: "${input.summary}"
`.trim(),
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          aspectRatio: "1:1",
        },
    });

  if (!media.url) {
    throw new Error('Failed to generate preview image.');
  }
  
  return media.url;
}
