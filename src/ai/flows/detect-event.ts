
'use server';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { eventDetectionPrompt } from '../prompts/event-detection';
import { DetectEventInputSchema, DetectEventOutputSchema } from '@/Schema/detecteventSchema';


export type DetectEventInput = z.infer<typeof DetectEventInputSchema>;
export type DetectEventOutput = z.infer<typeof DetectEventOutputSchema>;


export async function detectEvent(input: DetectEventInput): Promise<DetectEventOutput> {
  return detectEventFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectEventPrompt',
  input: {schema: DetectEventInputSchema},
  output: {schema: DetectEventOutputSchema},
  prompt: eventDetectionPrompt,
});


const detectEventFlow = ai.defineFlow(
  {
    name: 'detectEventFlow',
    inputSchema: DetectEventInputSchema,
    outputSchema: DetectEventOutputSchema,
  },
  async input => {
    if (!input.photoDataUri && !input.textContent) {
      return { events: [] };
    }
    const {output} = await prompt(input);
    console.log("Detecting Output,",output)
    // If the model can't find a title or a start date, it's not a valid event.
    if (!output || !Array.isArray(output.events) || output.events.length === 0) {
      return { events: [] };
    }
    
    // Also mark as not found if the model hallucinates a placeholder.
    if (output.events[0]?.title === 'no event found') {
      return { events: [] };
    }

    return output;
  }
);
