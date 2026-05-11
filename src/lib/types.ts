import { z } from 'zod';

/**
 * Schéma Zod pour la validation du formulaire de contact.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  email: z.string().email('Veuillez fournir une adresse email valide'),
  project_type: z.string().max(100).optional(),
  message: z
    .string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(5000, 'Le message ne doit pas dépasser 5000 caractères'),
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
