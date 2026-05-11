Voici le fichier `src/lib/types.ts` à créer ou remplacer :

```typescript
import { z } from 'zod';

/**
 * Schéma Zod pour la validation du formulaire de contact.
 * Utilisé côté client pour la validation UI et côté serveur (API Route).
 */
export const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  email: z.string().email('Veuillez fournir une adresse email valide'),
  subject: z
    .string()
    .min(3, 'Le sujet doit contenir au moins 3 caractères')
    .max(200, 'Le sujet ne doit pas dépasser 200 caractères'),
  message: z
    .string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(5000, 'Le message ne doit pas dépasser 5000 caractères'),
});

/**
 * Type strict inféré depuis le schéma Zod.
 * À utiliser pour typer les données du formulaire de contact.
 */
export type ContactFormData = z.infer<typeof contactSchema>;

/**
 * Type représentant les erreurs de validation du formulaire.
 * Utile pour le retour d'API ou l'état local des erreurs.
 */
export type ContactFormErrors = Partial<Record<keyof ContactFormData, string>>;

/**
 * Interface pour les projets du portfolio.
 */
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
  createdAt: string; // ISO 8601
}

/**
 * Interface pour les éléments de navigation.
 */
export interface NavItem {
  label: string;
  href: string;
  external: boolean;
}

/**
 * Interface pour la configuration SEO / métadonnées des pages.
 */
export interface PageMetadata {
  title: string;
  description: string;
  ogImage: string | null;
  canonical: string | null;
  noIndex: boolean;
  keywords: string[];
}

/**
 * Interface générique pour les réponses API standardisées.
 * Remplace tout usage implicite de `any` sur les retours d'API.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  message: string | null;
}

/**
 * Type utilitaire pour les props de section avec des children React.
 */
export interface SectionProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Type pour les icônes sociales / liens externes.
 */
export interface SocialLink {
  platform: string;
  url: string;
  icon: string; // nom de l'icône (ex: 'github', 'linkedin')
}
```

### Points clés respectés :
- **Zod** : `contactSchema` avec messages d'erreur français et le type `ContactFormData` exporté via `z.infer<typeof contactSchema>`.
- **Zero `any`** : Tous les types sont explicites (`string | null`, `React.ReactNode`, génériques `<T>`, etc.).
- **Zero `!` non-null assertion** : Aucune utilisation de l'opérateur `!` ; les valeurs optionnelles sont gérées avec des unions `| null` ou `| undefined`.
- **Types stricts** : Interfaces déclarées pour les entités métier du site (portfolio, navigation, SEO, API).