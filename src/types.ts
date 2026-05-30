export type Album = {
  id: number;
  name: string;
  artist: string | null;
  short_name: string | null;
  release_year: number | null;
  release_date: string | null;
  color: string | null;
  cover_image_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at?: string | null;
};

export type AlbumVersion = {
  id: number;
  album_id: number;
  name: string;
  short_name: string | null;
  sort_order: number | null;
};

export type CardCategory = {
  id: number;
  name: string;
  short_name: string | null;
  description: string | null;
  color: string | null;
  sort_order: number | null;
};

export type Card = {
  id: number;
  album_id: number;
  version_id: number | null;
  category_id: number;
  member: string;
  member_full_name: string | null;
  member_emoji: string | null;
  retailer: string | null;
  card_name: string;
  code: string;
  image_path: string;
  rarity: string | null;
  is_group: boolean | null;
  is_blurred: boolean | null;
  release_date: string | null;
  notes: string | null;
  created_at?: string | null;
  is_visible: boolean | null;
};

export type CardInsert = {
  album_id: number;
  version_id: number | null;
  category_id: number;
  member: string;
  member_full_name: string | null;
  member_emoji: string | null;
  retailer: string | null;
  card_name: string;
  code: string;
  image_path: string;
  rarity: string;
  is_group: boolean;
  is_blurred: boolean;
  release_date: string | null;
  notes: string | null;
  is_visible: boolean;
};

export type ImportedCropFile = {
  fileName: string;
  file: File;
};
