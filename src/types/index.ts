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
export type Material  = "louca" | "aco_inox" | "plastico" | "ceramica" | "metal" | "borracha" | "outro";

export interface Produto {
  id:                  number;
  sku:                 string;
  nome_produto:        string;
  categoria:           Categoria;
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
  image_url?:          string;
  hash_sha256?:        string;
  arquivo_original?:   string;
  processado_em?:      string;
  criado_em?:          string;
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
