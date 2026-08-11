import { z } from "zod";

export const studyTopicSchema = z.object({
  topic: z.string().trim().min(2, "Enter at least 2 characters.").max(80),
});

export type StudyTopicInput = z.infer<typeof studyTopicSchema>;
