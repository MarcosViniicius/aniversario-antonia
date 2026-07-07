-- Tabela de presentes — permite gerenciar a lista pelo painel owner
CREATE TABLE IF NOT EXISTS gifts (
  id         integer  PRIMARY KEY,
  name       text     NOT NULL,
  brand      text     NOT NULL DEFAULT '',
  category   text     NOT NULL CHECK (category IN ('beleza','casa','calcados','cozinha','acessorios','pix')),
  gift_limit integer  DEFAULT 1,   -- NULL = ilimitado (PIX)
  active     boolean  NOT NULL DEFAULT true,
  sort_order integer  NOT NULL DEFAULT 0
);

-- Todos os presentes da lista de Antônia Lucena — 80 Anos
INSERT INTO gifts (id, name, brand, category, gift_limit, sort_order) VALUES
  (1,  'Body Splash Boa Noite + Hidratante para as Mãos',  'O Boticário',   'beleza',     1,    1),
  (2,  'Colônia Águas de Framboesa',                        'Natura',         'beleza',     1,    2),
  (3,  'Colônia Thaty',                                      'O Boticário',   'beleza',     1,    3),
  (4,  'Kit Lençol com Elástico e Fronha Queen (Jogo 1)',   'São Cristóvão',  'casa',       1,    4),
  (5,  'Kit Lençol com Elástico e Fronha Queen (Jogo 2)',   'São Cristóvão',  'casa',       1,    5),
  (6,  'Jogo de Lençol Queen',                              'São Cristóvão',  'casa',       1,    6),
  (7,  'Sandália Ortopédica de Dedo Nº 37',                 'Picadilly',      'calcados',   1,    7),
  (8,  'Sandália Ortopédica Nº 37',                         'Mondare',        'calcados',   1,    8),
  (9,  'Cuscuzeira Inox 2,5 Litros',                        'Tramontina',     'cozinha',    1,    9),
  (10, 'Jogo de Pratos de Jantar (Pratos Fundos)',          '',               'cozinha',    1,   10),
  (11, '2 Pares de Brinco de Pressão',                      '',               'acessorios', 1,   11),
  (12, 'Panela de Pressão 4,5 L',                           'Tramontina',     'cozinha',    1,   12),
  (13, 'Conjunto de Corte de Bolo Inox',                    'Sanexc',         'cozinha',    1,   13),
  (14, 'Kit Lençol Queen com Elástico + 2 Travesseiros',    '',               'casa',       1,   14),
  (15, 'Escova Secadora Giratória',                         '',               'beleza',     1,   15),
  (16, 'Pix R$ 200,00',                                     '',               'pix',        NULL, 16)
ON CONFLICT (id) DO NOTHING;
