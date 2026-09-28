import { z } from 'zod';

export const createCommentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment is too long'),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment is too long'),
});

export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;
