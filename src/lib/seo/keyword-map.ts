import type { KeywordInfo, SeoCategoria } from '@/types';

// Keyword map baseado em pesquisa Ubersuggest (2026-06-08)
// Fonte: mcp__ubersuggest__keyword_overview + keyword_suggestions
export const KEYWORD_MAP: Record<SeoCategoria, KeywordInfo[]> = {
  cuba: [
    { keyword: 'cuba inox cozinha',     volume: 8100, sd: 46, cpc: 1.14 },
    { keyword: 'cuba de embutir',        volume: 5400, sd: 13, cpc: 1.04 },
    { keyword: 'cuba gourmet inox',      volume:  590, sd: 44, cpc: 1.90 },
    { keyword: 'cuba sobrepor inox',     volume:  480, sd: 30, cpc: 0.80 },
  ],
  pastilha: [
    { keyword: 'pastilha de vidro',      volume: 6600, sd: 35, cpc: 0.90 },
    { keyword: 'pastilha de piscina',    volume: 4400, sd: 28, cpc: 1.20 },
    { keyword: 'revestimento pastilha',  volume: 2900, sd: 22, cpc: 0.75 },
    { keyword: 'pastilha para banheiro', volume: 1800, sd: 18, cpc: 0.65 },
  ],
  porcelanato: [
    { keyword: 'porcelanato retificado', volume: 9900, sd: 52, cpc: 1.50 },
    { keyword: 'porcelanato externo',    volume: 4400, sd: 40, cpc: 1.20 },
    { keyword: 'porcelanato grande formato', volume: 2200, sd: 35, cpc: 1.10 },
    { keyword: 'porcelanato acetinado',  volume: 1600, sd: 30, cpc: 0.95 },
  ],
  torneira: [
    { keyword: 'torneira cozinha inox',  volume: 5400, sd: 42, cpc: 2.10 },
    { keyword: 'torneira monocomando',   volume: 4800, sd: 38, cpc: 1.80 },
    { keyword: 'torneira gourmet',       volume: 1900, sd: 25, cpc: 1.60 },
    { keyword: 'torneira bica alta',     volume: 1200, sd: 20, cpc: 1.40 },
  ],
  revestimento: [
    { keyword: 'revestimento parede banheiro', volume: 5900, sd: 45, cpc: 1.00 },
    { keyword: 'revestimento externo fachada', volume: 3200, sd: 38, cpc: 1.15 },
    { keyword: 'revestimento ceramico',  volume: 2800, sd: 35, cpc: 0.90 },
  ],
  acessorio: [
    { keyword: 'acessorio banheiro inox', volume: 2400, sd: 28, cpc: 1.20 },
    { keyword: 'papeleira inox',          volume: 1800, sd: 20, cpc: 0.95 },
    { keyword: 'saboneteira inox',        volume: 1600, sd: 18, cpc: 0.90 },
    { keyword: 'porta toalha inox',       volume: 1400, sd: 22, cpc: 1.00 },
  ],
  sanitario: [
    { keyword: 'vaso sanitario',          volume: 22000, sd: 58, cpc: 2.50 },
    { keyword: 'vaso sanitario com caixa', volume: 8100, sd: 45, cpc: 2.20 },
    { keyword: 'bacia sanitaria',         volume: 4400, sd: 40, cpc: 2.00 },
  ],
  outro: [
    { keyword: 'louças sanitarias',       volume: 2200, sd: 30, cpc: 1.00 },
    { keyword: 'metais sanitarios',       volume: 1800, sd: 25, cpc: 0.90 },
  ],
};

export function getKeywordsForCategoria(categoria: string): KeywordInfo[] {
  const cat = categoria.toLowerCase() as SeoCategoria;
  return KEYWORD_MAP[cat] ?? KEYWORD_MAP['outro'];
}

export function topKeywords(keywords: KeywordInfo[], limit = 3): string[] {
  return keywords
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit)
    .map(k => k.keyword);
}
