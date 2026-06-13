export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  tags: string[];
  duration: number;
  audioUrl?: string;
  coverUrl: string;
  artistId?: string | null;
  albumId?: string | null;
  trackNumber?: number | null;
  playCount: number;
  featured: boolean;
  uploadedBy: string;
  createdAt: any;
  updatedAt: any;
}