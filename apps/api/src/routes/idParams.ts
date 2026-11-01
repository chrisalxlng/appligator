import { z } from "zod";

export const idParamsSchema = z.object({ id: z.uuid() });
