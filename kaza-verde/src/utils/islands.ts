export interface IslandInfo {
  name: string;
  description: {
    en: string;
    pt: string;
  };
  image: string;
}

export const ISLANDS: IslandInfo[] = [
  {
    name: "Sal",
    description: {
      en: "White sand beaches and turquoise waters",
      pt: "Praias de areia branca e águas turquesa",
    },
    image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=600&h=400&fit=crop",
  },
  {
    name: "Boa Vista",
    description: {
      en: "Pristine dunes and desert landscapes",
      pt: "Dunas intocadas e paisagens desérticas",
    },
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop",
  },
  {
    name: "Santiago",
    description: {
      en: "Cultural capital with mountain valleys",
      pt: "Capital cultural com vales montanhosos",
    },
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&h=400&fit=crop",
  },
  {
    name: "São Vicente",
    description: {
      en: "Vibrant music scene and Mindelo harbor",
      pt: "Cena musical vibrante e porto do Mindelo",
    },
    image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&h=400&fit=crop",
  },
  {
    name: "Fogo",
    description: {
      en: "Volcanic island with unique wines",
      pt: "Ilha vulcânica com vinhos únicos",
    },
    image: "https://images.unsplash.com/photo-1476673160081-cf065607f449?w=600&h=400&fit=crop",
  },
  {
    name: "Santo Antão",
    description: {
      en: "Lush green mountains and hiking trails",
      pt: "Montanhas verdes e trilhos para caminhadas",
    },
    image: "https://images.unsplash.com/photo-1468413253725-0d5181091126?w=600&h=400&fit=crop",
  },
  {
    name: "Maio",
    description: {
      en: "Quiet island with secluded beaches",
      pt: "Ilha tranquila com praias isoladas",
    },
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop",
  },
];

export const ISLAND_NAMES = ISLANDS.map((i) => i.name);
