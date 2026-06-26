export type GiftCategory = 'beleza' | 'casa' | 'calcados' | 'cozinha' | 'acessorios' | 'pix'

export interface Gift {
  id: number
  name: string
  brand?: string
  category: GiftCategory
}

export interface CategoryConfig {
  label: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
}

export const categoryConfig: Record<GiftCategory, CategoryConfig> = {
  beleza: {
    label: 'Beleza',
    color: '#C9846B',
    bgColor: '#FDF0EC',
    borderColor: '#EAC5B8',
    textColor: '#8B4A35',
  },
  casa: {
    label: 'Casa',
    color: '#8B7BA8',
    bgColor: '#F4F0FA',
    borderColor: '#CFC7E8',
    textColor: '#5A4875',
  },
  calcados: {
    label: 'Calçados',
    color: '#A07850',
    bgColor: '#FBF3EC',
    borderColor: '#D4B898',
    textColor: '#6B4F30',
  },
  cozinha: {
    label: 'Cozinha',
    color: '#B88A40',
    bgColor: '#FDF6E8',
    borderColor: '#E8CFA0',
    textColor: '#7A5A1A',
  },
  acessorios: {
    label: 'Acessórios',
    color: '#C9A84C',
    bgColor: '#FDFAED',
    borderColor: '#EDD98A',
    textColor: '#8B6E1A',
  },
  pix: {
    label: 'Contribuição',
    color: '#4CAF9A',
    bgColor: '#EDF7F5',
    borderColor: '#A8DDD5',
    textColor: '#1A6B5A',
  },
}

export const gifts: Gift[] = [
  { id: 1,  name: 'Body Splash Boa Noite + Hidratante para as Mãos',  brand: 'O Boticário',    category: 'beleza'     },
  { id: 2,  name: 'Colônia Águas de Framboesa',                        brand: 'Natura',         category: 'beleza'     },
  { id: 3,  name: 'Colônia Thaty',                                      brand: 'O Boticário',    category: 'beleza'     },
  { id: 4,  name: 'Kit Lençol com Elástico e Fronha Queen (Jogo 1)',   brand: 'São Cristóvão',  category: 'casa'       },
  { id: 5,  name: 'Kit Lençol com Elástico e Fronha Queen (Jogo 2)',   brand: 'São Cristóvão',  category: 'casa'       },
  { id: 6,  name: 'Jogo de Lençol Queen',                              brand: 'São Cristóvão',  category: 'casa'       },
  { id: 7,  name: 'Sandália Ortopédica de Dedo Nº 37',                 brand: 'Picadilly',      category: 'calcados'   },
  { id: 8,  name: 'Sandália Ortopédica Nº 37',                         brand: 'Mondare',        category: 'calcados'   },
  { id: 9,  name: 'Cuscuzeira Inox 2,5 Litros',                        brand: 'Tramontina',     category: 'cozinha'    },
  { id: 10, name: 'Jogo de Pratos de Jantar (Pratos Fundos)',          brand: '',               category: 'cozinha'    },
  { id: 11, name: '2 Pares de Brinco de Pressão',                     brand: '',               category: 'acessorios' },
  { id: 12, name: 'Panela de Pressão 4,5 L',                          brand: 'Tramontina',     category: 'cozinha'    },
  { id: 13, name: 'Conjunto de Corte de Bolo Inox',                   brand: 'Sanexc',         category: 'cozinha'    },
  { id: 14, name: 'Kit Lençol Queen com Elástico + 2 Travesseiros',   brand: '',               category: 'casa'       },
  { id: 15, name: 'Escova Secadora Giratória',                         brand: '',               category: 'beleza'     },
  { id: 16, name: 'Pix R$ 200,00',                                     brand: '',               category: 'pix'        },
]
