export type Qualidade = "excelente" | "boa" | "regular" | "ruim";
export type Categoria = "cuba" | "sanitario" | "flexivel" | "rejunte" | "acessorio" | "outro";
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

export interface FiltrosProduto {
  search?:     string;
  categoria?:  Categoria[];
  qualidade?:  Qualidade[];
  revisao?:    boolean;
}

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
