import { z } from 'zod';

export const filterQuerySchema = z.object({
  region: z.string().optional(),
  currency: z.string().optional(),
  sort: z
    .enum(['gdp_asc', 'gdp_desc', 'population_asc', 'population_desc', 'name_asc', 'name_desc'])
    .optional(),
});

export type FilterQuery = z.infer<typeof filterQuerySchema>;
