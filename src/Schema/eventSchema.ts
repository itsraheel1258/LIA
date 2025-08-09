import { z } from "genkit";

export const EventSchema = z.object({
    title: z.string().describe("The title of the event."),
    startDate: z.string().describe("The start date of the event."),
    description: z.string().optional().describe("A short summary of the event's purpose."),
  });
  
  