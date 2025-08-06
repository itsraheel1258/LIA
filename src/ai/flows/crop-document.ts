
'use server';

/**
 * @fileOverview Detects and crops a document from an image.
 *
 * - cropDocument - A function that takes an image and returns a cropped version of the document found within it.
 * - CropDocumentInput - The input type for the cropDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { media } from 'genkit/media';


const CropDocumentInputSchema = z.object({
  photoDataUris: z.array(z
    .string()
    .describe(
      "A photo containing a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    )
  ).describe('An array of photos of document pages.'),
});
export type CropDocumentInput = z.infer<typeof CropDocumentInputSchema>;


export async function cropDocument(input: CropDocumentInput): Promise<string> {
  const {media: result} = await ai.generate({
    model: 'googleai/gemini-2.0-flash-preview-image-generation',
    prompt: [
        {text: `You are a precision document scanner. Your task is to isolate the document from the provided image(s).

- If multiple images are provided, they represent pages of a single document. Stitch them together vertically into one tall image before processing.
- Identify the main document in the resulting image.
- Perform a perspective transform to make the document rectangular, as if it were scanned from directly above.
- Crop the image to the exact boundaries of the document. Do not include any of the surrounding background or padding.
- CRITICAL: Do NOT alter, enhance, or change the content (text, images, layout) of the document in any way. The output must be a faithful, unaltered, cropped version of the original.
- Return the result as a high-quality image.
        `},
        ...input.photoDataUris.map(uri => ({media: {url: uri}}))
    ],
    config: {
        responseModalities: ['IMAGE', 'TEXT']
    },
  });

  if (!result || !result.url) {
    throw new Error('Failed to crop the document.');
  }
  
  return result.url;
}
