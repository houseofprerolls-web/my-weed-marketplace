import { z } from 'zod';

export const vendorLeadFormSchema = z
  .object({
    businessName: z.string().trim().min(1, 'Business name is required').max(200),
    contactEmail: z.string().trim().email('Enter a valid email').max(320),
    contactPhone: z
      .string()
      .trim()
      .min(1, 'Phone is required')
      .max(40)
      .refine((v) => v.replace(/\D/g, '').length >= 10, 'Enter a valid phone number (at least 10 digits)'),
    zip: z
      .string()
      .trim()
      .min(1, 'ZIP code is required')
      .max(16)
      .refine((v) => {
        const d = v.replace(/\D/g, '');
        return d.length >= 5;
      }, 'Enter a valid ZIP (at least 5 digits)'),
    licenseNumber: z.string().trim().max(120).optional(),
    /** How the shop wants to appear after approval (at least one). */
    listAsDelivery: z.boolean().default(true),
    listAsStorefront: z.boolean().default(false),
  })
  .refine((d) => d.listAsDelivery || d.listAsStorefront, {
    message: 'Choose delivery, storefront, or both.',
    path: ['listAsStorefront'],
  });

export type VendorLeadFormValues = z.infer<typeof vendorLeadFormSchema>;
