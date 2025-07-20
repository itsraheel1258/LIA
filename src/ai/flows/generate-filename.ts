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
  prompt: `You are an AI assistant that analyzes document images and generates smart, human-readable filenames, folder tags and metadata for them.

Analyze the document in the image and extract information to create a filename, folder tags, and metadata.

Filename:
- Create a descriptive and human-readable filename that includes relevant information such as the document type, sender, and date.
- Example: "Bank Statement - Chase - June 2024"

Folder Tags:
- Suggest relevant folder tags for organizing the document.
- Examples: ["Finance > Banking", "Healthcare > Insurance"]

Metadata:
- Extract and provide metadata such as sender, date, and category, if available.

Here is the document image: {{media url=photoDataUri}}

Return the filename, folder tags and metadata as a JSON object. Furthermore, remove any '\n' characters from the filename and metadata fields.`, // Added instruction to remove '\n'
});

const generateSmartFilenameFlow = ai.defineFlow(
  {
    name: 'generateSmartFilenameFlow',
    inputSchema: GenerateSmartFilenameInputSchema,
    outputSchema: GenerateSmartFilenameOutputSchema,
  },
  async input => {
    const {output} = await generateSmartFilenamePrompt(input);
    return output!;
  }
);
