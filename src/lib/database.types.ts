/**
 * Schéma des tables que le site touche, recopié de
 * `supabase/migrations/20260901120000_portfolio_contacts.sql`. Le client était
 * typé `SupabaseClient<any>` (les deux clients, serveur et navigateur) : une colonne mal nommée dans l'insertion de
 * /api/contact passait `tsc` et n'échouait qu'en production, en silence (l'erreur
 * est journalisée, le visiteur reçoit quand même un succès). À tenir à jour avec
 * toute migration qui change ces colonnes.
 */
export type Database = {
  public: {
    Tables: {
      portfolio_contacts: {
        Row: {
          id: string
          name: string
          email: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          message?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
