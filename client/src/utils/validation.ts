import { z } from 'zod';

// Child validation schema
export const childSchema = z.object({
  childId: z.string().min(1, 'Child ID is required'),
  fullName: z.string().min(1, 'Full name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  gender: z.enum(['male', 'female'], { required_error: 'Gender is required' }),
  district: z.string().min(1, 'District is required'),
  healthFacility: z.string().min(1, 'Health facility is required'),
  caretakerName: z.string().min(1, 'Caretaker name is required'),
  caretakerContact: z.string().min(1, 'Caretaker contact is required'),
  registeredBy: z.number().optional()
});

// Screening validation schema
export const screeningSchema = z.object({
  childId: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  weight: z.number().min(0, 'Weight must be positive'),
  height: z.number().min(0, 'Height must be positive'),
  muac: z.number().min(0, 'MUAC must be positive'),
  screenedBy: z.number().optional(),
  notes: z.string().optional()
});

// Tier validation schema
export const tierSchema = z.object({
  name: z.string().min(1, 'Tier name is required'),
  district: z.string().min(1, 'District is required'),
  description: z.string().optional()
});

// Referral validation schema
export const referralSchema = z.object({
  childId: z.number(),
  tierId: z.number(),
  reason: z.string().min(1, 'Reason is required'),
  status: z.enum(['pending', 'completed', 'cancelled'], { required_error: 'Status is required' }),
  referredBy: z.number().optional(),
  notes: z.string().optional()
});

// Validation helper functions
export async function validateData<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      throw new Error(JSON.stringify(errors));
    }
    throw error;
  }
}

// Type guards
export function isValidChild(data: unknown): data is z.infer<typeof childSchema> {
  return childSchema.safeParse(data).success;
}

export function isValidScreening(data: unknown): data is z.infer<typeof screeningSchema> {
  return screeningSchema.safeParse(data).success;
}

export function isValidTier(data: unknown): data is z.infer<typeof tierSchema> {
  return tierSchema.safeParse(data).success;
}

export function isValidReferral(data: unknown): data is z.infer<typeof referralSchema> {
  return referralSchema.safeParse(data).success;
} 