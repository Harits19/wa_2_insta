
export interface MediaItem {
  id: string;
  filename: string;
  baseUrl: string;
  productUrl: string;
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
  };
}

export interface SearchResponse {
  mediaItems: MediaItem[];
  nextPageToken?: string;
}

export interface DownloadedMediaItem extends MediaItem{

  buffer: Buffer;
  type: "image" | "video"
}

