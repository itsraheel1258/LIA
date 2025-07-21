'use server';

/**
 * @fileOverview Generates a smart, human-readable filename for a scanned document.
 *
 * - generateSmartFilename - A function that generates a smart filename.
 * - GenerateSmartFilenameInput - The input type for the generateSmartFilename function.
 * - GenerateSmartFilenameOutput - The return type for the generateSmartFilename function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSmartFilenameInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type GenerateSmartFilenameInput = z.infer<typeof GenerateSmartFilenameInputSchema>;

const GenerateSmartFilenameOutputSchema = z.object({
  filename: z.string().describe('A smart, human-readable filename for the document.'),
  folderTags: z.array(z.string()).describe('Suggested folder tags for the document.'),
  metadata: z.object({
    sender: z.string().optional().describe('The sender of the document, if identifiable.'),
    date: z.string().optional().describe('The date of the document, if identifiable.'),
    category: z.string().optional().describe('The category of the document.'),
  }),
});
export type GenerateSmartFilenameOutput = z.infer<typeof GenerateSmartFilenameOutputSchema>;

export async function generateSmartFilename(input: GenerateSmartFilenameInput): Promise<GenerateSmartFilenameOutput> {
  return generateSmartFilenameFlow(input);
}

const generateSmartFilenamePrompt = ai.definePrompt({
  name: 'generateSmartFilenamePrompt',
  input: {schema: GenerateSmartFilenameInputSchema},
  output: {schema: GenerateSmartFilenameOutputSchema},
  prompt: `You are an AI assistant that analyzes document images and generates smart, human-readable filenames and metadata.

Analyze the document in the image provided. Based on the document's content, generate a descriptive filename, a list of folder tags, and extract any available metadata (sender, date, category).

- The filename should be concise and descriptive (e.g., "Bank Statement - Chase - June 2024").
- The folderTags should be a simple list of keywords for organization (e.g., ["Finance", "Banking"]).
- The metadata should include the sender, date, and category if they can be identified.

Here is the document image: {{media url=photoDataUri}}

IMPORTANT: Your response MUST be a valid JSON object that conforms to the specified output schema. Do not include any other text or explanations outside of the JSON object itself.
`,
});

const generateSmartFilenameFlow = ai.defineFlow(
  {
    name: 'generateSmartFilenameFlow',
    inputSchema: GenerateSmartFilenameInputSchema,
    outputSchema: GenerateSmartFilenameOutputSchema,
  },
  async input => {
    const {output} = await generateSmartFilenamePrompt(input);
    if (!output) {
      throw new Error('Failed to get a response from the AI model.');
    }
    // A fallback in case the model doesn't generate tags
    if (!output.folderTags || output.folderTags.length === 0) {
      output.folderTags = ['Uncategorized'];
    }
    return output;
  }
);
