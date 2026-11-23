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
  collection_type_id?: number | null;
  era_id?: number | null;
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
  is_active: boolean | null;
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
  /** Ruta LEGACY en el bucket photocards. Puede ser null (card creada desde una propuesta o imagen retirada). */
  image_path: string | null;
  rarity: string | null;
  is_group: boolean | null;
  is_blurred: boolean | null;
  release_date: string | null;
  notes: string | null;
  created_at?: string | null;
  is_visible: boolean | null;
  card_set_id?: number | null;
  country: string | null;
  draw_type: string | null;
  sort_order: number;
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
  card_set_id: number | null;
  country: string | null;
  draw_type: string | null;
  sort_order?: number;
};

export type ImportedCropFile = {
  fileName: string;
  file: File;
};

export type CollectionType = {
  id: number;
  name: string;
  short_name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

export type AlbumEra = {
  id: number;
  collection_type_id: number;
  name: string;
  short_name: string;
  description: string | null;
  icon_name: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

export type CardSet = {
  id: number;
  album_id: number;
  version_id: number | null;
  category_id: number | null;
  name: string;
  short_name: string;
  description: string | null;
  retailer: string | null;
  round: string | null;
  country: string | null;
  draw_type: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// Purple Collector v2: imágenes, moderación y Community Challenge
// ---------------------------------------------------------------------------

export type ImageSourceType = 'legacy' | 'community' | 'admin';
export type ImageStatus = 'pending' | 'approved' | 'rejected';
export type ImageSide = 'front' | 'back';

export type CardImage = {
  id: number;
  card_id: number;
  bucket_id: string;
  storage_path: string;
  source_type: ImageSourceType;
  status: ImageStatus;
  is_primary: boolean;
  side: ImageSide;
  contributed_by: string | null;
  contributor_handle: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  taken_down_at: string | null;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  created_at: string;
};

export type ReportReason = 'wrong_card' | 'duplicate' | 'copyright' | 'inappropriate' | 'low_quality' | 'other';
export type ReportStatus = 'open' | 'resolved_kept' | 'resolved_removed' | 'dismissed';

export type ImageReport = {
  id: number;
  card_image_id: number;
  reported_by: string | null;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  card_images?: CardImage | null;
};

export type CardSubmission = {
  id: number;
  submitted_by: string | null;
  contributor_handle: string | null;
  status: ImageStatus;
  album_id: number | null;
  version_id: number | null;
  category_id: number | null;
  card_set_id: number | null;
  era_id: number | null;
  collection_type_id: number | null;
  album_unlisted: boolean;
  member: string;
  card_name: string | null;
  notes: string | null;
  bucket_id: string;
  storage_path: string;
  back_storage_path: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_card_id: number | null;
  created_at: string;
};

export type ChallengeStatus = 'draft' | 'active' | 'reviewing' | 'finished';

export type Challenge = {
  id: number;
  slug: string;
  kind: string;
  title: string;
  status: ChallengeStatus;
  starts_at: string | null;
  ends_at: string | null;
  closed_at: string | null;
  finalized_at: string | null;
  rules_version: string;
  prizes: { place: number; months: number }[];
  created_at: string;
};

export type ChallengeOverview = {
  eligible_cards: number;
  completed_cards: number;
  approved_images: number;
  pending_images: number;
  rejected_images: number;
  participants: number;
  active_voids: number;
};

export type ChallengeStanding = {
  rank: number;
  user_id: string;
  username: string | null;
  points: number;
  reached_at: string;
  tied: boolean;
};

export type ChallengeContribution = {
  card_image_id: number;
  card_id: number;
  side: ImageSide;
  status: ImageStatus;
  contributed_by: string;
  username: string | null;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  taken_down_at: string | null;
  scores: boolean;
};

export type ChallengePointVoid = {
  id: number;
  challenge_id: number;
  card_id: number;
  user_id: string;
  reason: string;
  voided_at: string;
  restored_at: string | null;
  restore_reason: string | null;
};
