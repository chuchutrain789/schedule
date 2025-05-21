// src/ai/flows/suggest-schedule.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting an optimized schedule based on task priorities and deadlines.
 *
 * - suggestSchedule - A function that takes task details and suggests an optimized schedule.
 * - SuggestScheduleInput - The input type for the suggestSchedule function.
 * - SuggestScheduleOutput - The return type for the suggestSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestScheduleInputSchema = z.object({
  tasks: z
    .array(
      z.object({
        name: z.string().describe('The name of the task.'),
        assignee: z.string().describe('The person responsible for the task.'),
        deadline: z.string().describe('The deadline for the task (e.g., YYYY-MM-DD).'),
        priority: z.enum(['high', 'medium', 'low']).describe('The priority of the task.'),
      })
    )
    .describe('A list of tasks with their details.'),
});
export type SuggestScheduleInput = z.infer<typeof SuggestScheduleInputSchema>;

const SuggestScheduleOutputSchema = z.object({
  scheduleSuggestions: z
    .string()
    .describe('AI suggested schedule in markdown format, with time slots and assigned tasks.'),
});
export type SuggestScheduleOutput = z.infer<typeof SuggestScheduleOutputSchema>;

export async function suggestSchedule(input: SuggestScheduleInput): Promise<SuggestScheduleOutput> {
  return suggestScheduleFlow(input);
}

const suggestSchedulePrompt = ai.definePrompt({
  name: 'suggestSchedulePrompt',
  input: {schema: SuggestScheduleInputSchema},
  output: {schema: SuggestScheduleOutputSchema},
  prompt: `You are an AI assistant that specializes in creating optimized schedules.

  Given the following tasks, their assignees, deadlines, and priorities, create an optimized schedule in markdown format.

  Tasks:
  {{#each tasks}}
  - Task Name: {{name}}
    Assignee: {{assignee}}
    Deadline: {{deadline}}
    Priority: {{priority}}
  {{/each}}

  Consider the priority and deadlines of each task to create the most efficient schedule.
  The schedule should include time slots and assigned tasks. Use Korean for all text.
  Use markdown to format the output.
  `, // Korean language
});

const suggestScheduleFlow = ai.defineFlow(
  {
    name: 'suggestScheduleFlow',
    inputSchema: SuggestScheduleInputSchema,
    outputSchema: SuggestScheduleOutputSchema,
  },
  async input => {
    const {output} = await suggestSchedulePrompt(input);
    return output!;
  }
);
