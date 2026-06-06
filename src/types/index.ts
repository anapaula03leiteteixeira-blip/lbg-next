export type Role      = "admin" | "editor" | "viewer";

export interface Usuario {
  id:            number;
  email:         string;
  nome:          string;
  role:          Role;
  ativo:         boolean;
  criado_em:     string;
  ultimo_acesso?: string;
}

export interface UsuarioForm {
  email:    string;
  nome:     string;
  role:     Role;
  password: string;
  ativo:    boolean;
}

export interface AuthUser {
  email: string;
  name:  string;
  role:  Role;
}

export type Qualidade = "excelente" | "boa" | "regular" | "ruim";
export type Categoria = "cuba" | "sanitario" | "flexivel" | "rejunte" | "acessorio" | "pastilha" | "outro";
export type Angulo    = "frontal" | "lateral" | "superior" | "perspectiva" | "detalhe" | "conjunto" | "embalagem";
export type Fundo     = "branco" | "colorido" | "ambiente" | "transparente" | "outro";
export type Material  = "louca" | "aco_inox" | "plastico" | "ceramica" | "metal" | "borracha" | "vidro" | "outro";

// Foto individual de um produto (N por SKU)
export interface ProdutoImagem {
  id:                  number;
  sku:                 string;
  image_url?:          string;
  angulo?:             string;          // string: dados legados podem ter valores fora do enum
  fundo?:              Fundo;
  qualidade_foto?:     Qualidade;
  cor_dominante?:      string;
  material_aparente?:  string;
  problemas_foto?:     string[];
  precisa_revisao:     boolean;
  hash_sha256?:        string;
  arquivo_original?:   string;
  processado_em?:      string;
  criado_em?:          string;
  // Enriquecido via JOIN com produtos (presente quando vem da API)
  nome_produto?:       string;
  categoria?:          Categoria;
  subcategoria?:       string;
  descricao_marketing?: string;
  descricao_tecnica?:  string;
  tags?:               string[];
}

// Produto master — 1 por SKU
export interface Produto {
  sku:                 string;
  nome_produto:        string;
  categoria:           Categoria;
  subcategoria?:       string;
  cor_dominante?:      string;
  material_aparente?:  Material;
  tags?:               string[];
  descricao_marketing?: string;
  descricao_tecnica?:  string;
  criado_em?:          string;
  atualizado_em?:      string;
  // Campos derivados da melhor imagem (retornados pela API)
  image_url?:          string;
  qualidade_foto?:     Qualidade;
  precisa_revisao?:    boolean;
  // Campos opcionais para compatibilidade com formulários de foto
  angulo?:             Angulo;
  fundo?:              Fundo;
  problemas_foto?:     string[];
  // Imagens embutidas
  imagens?:            ProdutoImagem[];
}

export interface ProdutoGabi {
  sku:                  string;
  nome_produto:         string;
  categoria:            Categoria;
  cor_dominante?:       string;
  qualidade_foto?:      Qualidade;
  image_url?:           string;
  descricao_marketing:  string | null;
  tags?:                string[];
}

export interface FiltrosProduto {
  search?:     string;
  categoria?:  Categoria[];
  qualidade?:  Qualidade[];
  revisao?:    boolean;
}

// ── Copies SEO ────────────────────────────────────────────────────────────────
export type Plataforma = "amazon" | "mercado_livre" | "shopee" | "leroy_merlin" | "madeira_madeira";

export interface ProdutoCopy {
  id:             number;
  sku:            string;
  plataforma:     Plataforma;
  titulo:         string;
  bullets:        string[] | null;
  descricao:      string;
  palavras_chave: string[] | null;
  gerado_em:      string;
  atualizado_em:  string;
}

export const COPY_LIMITS: Record<Plataforma, { titulo: number; bullets?: { count: number; chars: number }; descricao: number }> = {
  amazon:          { titulo: 200, bullets: { count: 5,  chars: 255 }, descricao: 2000 },
  mercado_livre:   { titulo: 60,                                       descricao: 4000 },
  shopee:          { titulo: 120,                                      descricao: 3000 },
  leroy_merlin:    { titulo: 100, bullets: { count: 10, chars: 200 }, descricao: 1000 },
  madeira_madeira: { titulo: 150,                                      descricao: 2000 },
};

export const PLATAFORMA_LABEL: Record<Plataforma, string> = {
  amazon:          "Amazon",
  mercado_livre:   "Mercado Livre",
  shopee:          "Shopee",
  leroy_merlin:    "Leroy Merlin",
  madeira_madeira: "MadeiraMadeira",
};

// ── Classificação IA ──────────────────────────────────────────────────────────
export interface ClassificacaoIA {
  sku?:                string;
  nome_produto?:       string;
  categoria?:          Categoria;
  subcategoria?:       string;
  cor_dominante?:      string;
  angulo?:             Angulo;
  fundo?:              Fundo;
  qualidade_foto?:     Qualidade;
  material_aparente?:  Material;
  tags?:               string[];
  problemas_foto?:     string[];
  descricao_marketing?: string;
  descricao_tecnica?:  string;
  precisa_revisao?:    boolean;
}
