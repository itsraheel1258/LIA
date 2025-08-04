
'use server';

/**
 * @fileOverview Generates a smart, human-readable filename for a scanned document from its text content.
 *
 * - summarizeText - A function that generates a smart filename from text.
 * - SummarizeTextInput - The input type for the summarizeText function.
 * - SummarizeTextOutput - The return type for the summarizeText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Using the same output schema as generate-filename for consistency
import { GenerateSmartFilenameOutput as SummarizeTextOutput, GenerateSmartFilenameOutput } from './generate-filename';
export type { SummarizeTextOutput };


const SummarizeTextInputSchema = z.object({
  textContent: z.string().describe("The text content of the document."),
});
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;


export async function summarizeText(input: SummarizeTextInput): Promise<SummarizeTextOutput> {
  return summarizeTextFlow(input);
}

const summarizeTextPrompt = ai.definePrompt({
  name: 'summarizeTextPrompt',
  input: {schema: SummarizeTextInputSchema},
  output: {schema: GenerateSmartFilenameOutput},
  prompt: `You are an AI assistant that analyzes document text and generates smart, human-readable filenames and metadata.

Analyze the document text provided below. Based on the document's content, generate the following:
- A descriptive filename (e.g., "Bank Statement - Chase - June 2024.pdf").
- A concise, one to two-sentence summary of the document's content.
- A list of folder tags for organization (e.g., ["Finance", "Banking"]).
- A hierarchical folder path based on the tags (e.g., "Finance/Banking").
- Extract any available metadata. For the sender, extract ONLY the name and email address, not the surrounding text.

Here is the document text:
---
{{textContent}}
---

IMPORTANT: Your response MUST be a valid JSON object that conforms to the specified output schema. Do not include any other text or explanations outside of the JSON object itself.
`,
});

const summarizeTextFlow = ai.defineFlow(
  {
    name: 'summarizeTextFlow',
    inputSchema: SummarizeTextInputSchema,
    outputSchema: GenerateSmartFilenameOutput,
  },
  async input => {
    const {output} = await summarizeTextPrompt(input);
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
    // Since this is a PDF, ensure the filename has a .pdf extension
    if (!output.filename.toLowerCase().endsWith('.pdf')) {
        output.filename += '.pdf';
    }
    
    return output;
  }
);
