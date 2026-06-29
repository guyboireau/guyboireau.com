/**
 * Types de la base Supabase.
 *
 * Schéma minimal calqué sur les colonnes réellement écrites/lues par
 * l'application (formulaires de contact). Permet de paramétrer
 * `createClient<Database>()` et de supprimer les casts `as any` sur les
 * requêtes `.from(...).insert(...)`.
 *
 * Pour régénérer un schéma complet depuis le projet Supabase :
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ContactColumns = {
  Row: {
    id: string;
    name: string;
    email: string;
    message: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    name: string;
    email: string;
    message: string;
    created_at?: string;
  };
  Update: {
    id?: string;
    name?: string;
    email?: string;
    message?: string;
    created_at?: string;
  };
  Relationships: [];
};

type PricingTierColumns = {
  Row: {
    id: string;
    name: string;
    price: number;
    description: string | null;
    features: Json;
    highlighted: boolean | null;
    cta_label: string | null;
  };
  Insert: {
    id?: string;
    name: string;
    price: number;
    description?: string | null;
    features?: Json;
    highlighted?: boolean | null;
    cta_label?: string | null;
  };
  Update: {
    id?: string;
    name?: string;
    price?: number;
    description?: string | null;
    features?: Json;
    highlighted?: boolean | null;
    cta_label?: string | null;
  };
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      contacts: ContactColumns;
      portfolio_contacts: ContactColumns;
      pricing_tiers: PricingTierColumns;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
