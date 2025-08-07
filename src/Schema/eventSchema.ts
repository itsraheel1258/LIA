import { z } from "genkit";

export const EventSchema = z.object({
    title: z.string(),
    startDate: z.string(),
    description: z.string().nullable(),
  });
  
  