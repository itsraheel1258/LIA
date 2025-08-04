
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

export const GenerateSmartFilenameOutputSchema = z.object({
  filename: z.string().describe('A smart, human-readable filename for the document.'),
  summary: z.string().describe('A concise, one to two-sentence summary of the document.'),
  folderPath: z.string().describe('Suggested folder path for the document (e.g., "Finance/Banking").'),
  folderTags: z.array(z.string()).describe('Suggested folder tags for the document.'),
  metadata: z.object({
    sender: z.string().optional().describe('The sender of the document (name and email only), if identifiable.'),
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

Analyze the document in the image provided. Based on the document's content, generate the following:
- A descriptive filename (e.g., "Bank Statement - Chase - June 2024").
- A concise, one to two-sentence summary of the document's content.
- A list of folder tags for organization (e.g., ["Finance", "Banking"]).
- A hierarchical folder path based on the tags (e.g., "Finance/Banking").
- Extract any available metadata. For the sender, extract ONLY the name and email address, not the surrounding text.

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
    // A fallback in case the model doesn't generate tags or path
    if (!output.folderTags || output.folderTags.length === 0) {
      output.folderTags = ['Uncategorized'];
    }
    if (!output.folderPath) {
        output.folderPath = output.folderTags.join(' / ');
    }
    return output;
  }
);
