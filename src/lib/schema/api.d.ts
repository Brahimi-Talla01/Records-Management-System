/**
 * Types générés depuis le contrat OpenAPI du backend.
 *
 * NE PAS ÉDITER À LA MAIN. Régénérer avec :
 *   npm run codegen   (backend démarré : GET /api/openapi.json)
 *
 * Tant que le backend n'est pas joignable, ce fichier reste un placeholder
 * (les types JSDoc de `features/*/types.js` s'y référeront progressivement).
 */
export interface paths {}
export interface components {
  schemas: {
    /** Utilisateur tel que renvoyé par l'API. */
    User: {
      user_id?: number;
      username: string;
      email?: string | null;
      full_name?: string | null;
      role?: { role_id?: number; name: string } | null;
      campus_id?: number | null;
      is_active?: boolean;
    };
  };
}
