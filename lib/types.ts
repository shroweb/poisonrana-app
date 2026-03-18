export interface User {
  id: string;
  name: string;
  email: string;
  slug: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  favoritePromotion?: string;
}

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  error: string | null;
  meta?: ApiMeta;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  date: string;
  promotion: string;
  venue?: string;
  posterUrl?: string;
  type?: string;
  reviewCount: number;
  matchCount?: number;
  averageRating: number;
  description?: string;
  startTime?: string | null;
  endTime?: string | null;
  enableWatchParty?: boolean;
  enablePredictions?: boolean;
  matches?: Match[];
}

export interface Match {
  id: string;
  title: string;
  type: string;
  duration?: number;
  rating: number;
  order: number;
  participants: Participant[];
}

export interface Participant {
  id: string;
  team: number;
  isWinner: boolean;
  wrestler: Wrestler;
}

export interface Wrestler {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  bio?: string;
  matchCount?: number;
}

export interface RankedEvent extends Event {
  bayesianScore: number;
}

export interface RankedMatch extends Match {
  event: {
    id: string;
    title: string;
    slug: string;
    date: string;
    promotion: string;
  };
}

export interface Promotion {
  id: string;
  shortName: string;
  fullName: string;
  logoUrl?: string;
  eventCount: number;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  user: Pick<User, "id" | "name" | "slug" | "avatarUrl">;
  createdAt: string;
  likeCount?: number;
  likedByMe?: boolean;
}

export interface WatchlistItem {
  id: string;
  event: Event;
  createdAt: string;
  watched?: boolean;
  attended?: boolean;
}
