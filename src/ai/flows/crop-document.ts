
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
        {text: `You are a document scanner. Your task is to extract the document from the provided images.
        
- If multiple images are provided, they represent pages of a single document. Stitch them together vertically into one tall image before processing.
- Identify the main document in the resulting image.
- Perform a perspective transform to make it look like a flat, top-down scan.
- Crop the image to the exact boundaries of the document.
- Do not add any padding or background. The output image should ONLY be the document itself.
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
