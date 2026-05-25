/**
 * Fase “só Meta”: Google Ads (Campanhas, Dashboard) fica oculto sem esta flag.
 * Scraping mantém sempre as duas fontes (OSM + Google Places).
 * Para reativar Ads: no `.env` do frontend defina VITE_FEATURE_GOOGLE=true e reinicie o Vite.
 */
export const featureGoogle = import.meta.env.VITE_FEATURE_GOOGLE === 'true';
