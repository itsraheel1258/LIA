import { config } from 'dotenv';
config();

import '@/ai/flows/generate-filename.ts';
import '@/ai/flows/suggest-tags.ts';
import '@/ai/flows/crop-document.ts';
import '@/ai/flows/extract-text.ts';
import '@/ai/flows/summarize-text.ts';
