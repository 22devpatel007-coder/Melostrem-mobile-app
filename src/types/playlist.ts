export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  songs: string[];
  createdBy: string;
  isPublic: boolean;
  createdAt: any;
  updatedAt: any;
}