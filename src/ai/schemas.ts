/**
 * @fileOverview This file contains the Zod schemas that are shared between the client and the server.
 * It does not contain any server-side logic and can be safely imported into client components.
 */

import {z} from 'genkit';

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
