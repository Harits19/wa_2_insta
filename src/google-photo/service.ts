import GoogleOauthService from "../google-oauth/service";
import axios from "axios";
import * as fs from "fs";
import PromiseService from "../promise/service";
import path from "path";

interface MediaItem {
  id: string;
  filename: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
  };
}
interface SearchResponse {
  mediaItems: MediaItem[];
  nextPageToken?: string;
}

export default class GooglePhotoService {
  googleOauth: GoogleOauthService;

  constructor({ googleOauth }: { googleOauth: GoogleOauthService }) {
    this.googleOauth = googleOauth;
  }

  async getImage({
    date,
    pageToken,
  }: {
    date: { year: number; month: number; day: number };
    pageToken?: string;
  }) {
    const requestBody = {
      pageSize: 3,
      pageToken,
      filters: {
        dateFilter: {
          dates: [date],
        },
      },
    };

    const url = "https://photoslibrary.googleapis.com/v1/mediaItems:search";

    const accessToken = await this.googleOauth.accessToken();

    const headers = { Authorization: `Bearer ${accessToken}` };

    const res = await axios.post<SearchResponse>(url, requestBody, {
      headers,
    });

    const items = res.data.mediaItems;
    console.log("push new array with ", items);
    const result = await PromiseService.run({
      promises: items.map((item) => this.download({ item: item })),
    });

    return {
      result,
      pageToken: res.data.nextPageToken,
    };
  }

  async download({ item }: { item: MediaItem }) {
    const baseUrl = item.baseUrl;
    console.log("start download", item.filename, item.mediaMetadata);
    const accessToken = await this.googleOauth.accessToken();
    const response = await axios.get(`${baseUrl}=d`, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      buffer: Buffer.from(response.data),
      ...item,
    };
  }
}
