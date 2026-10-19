import { z } from 'zod';

// Le nom et le type de projet vont dans le sujet de l'email : un saut de ligne
// y serait au mieux un sujet cassé, au pire une injection d'en-tête.
const surUneLigne = (valeur: string) => !/[\r\n]/.test(valeur);

/**
 * Schéma du formulaire de contact : seul validateur, appliqué par la route
 * `src/pages/api/contact.ts` ; le formulaire en tire son type. Messages en
 * français : ils sont affichés sous le champ concerné (aria-describedby), ils
 * doivent dire au visiteur quoi corriger.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères.')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères.')
    .refine(surUneLigne, 'Le nom doit tenir sur une seule ligne.'),
  email: z
    .string()
    .email('Adresse e-mail invalide.')
    .max(320, "L'adresse e-mail ne doit pas dépasser 320 caractères."),
  project_type: z
    .string()
    .max(100)
    .refine(surUneLigne, 'Le type de projet doit tenir sur une seule ligne.')
    .optional(),
  message: z
    .string()
    .min(10, 'Le message doit contenir au moins 10 caractères.')
    .max(5000, 'Le message ne doit pas dépasser 5 000 caractères.'),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export type ContactFormErrors = Partial<Record<keyof ContactFormData, string>>;

export interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  tags: string[];
  imageUrl: string;
  liveUrl: string | null;
  repoUrl: string | null;
  featured: boolean;
  createdAt: string;
}

export interface NavItem {
  label: string;
  href: string;
  external: boolean;
}

export interface PageMetadata {
  title: string;
  description: string;
  ogImage: string | null;
  canonical: string | null;
  noIndex: boolean;
  keywords: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  message: string | null;
}

export interface SectionProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}
