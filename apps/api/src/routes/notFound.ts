import { z } from "zod";

export const notFoundSchema = z.object({ error: z.literal("Not Found") });
