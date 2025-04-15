import GoogleOauthService from "../google-oauth/service";
import axios from "axios";
import * as fs from "fs";
import PromiseService from "../promise/service";
import path from "path";
import puppet from "puppeteer";
import PuppeteerService from "../puppeteer/service";

interface MediaItem {
  id: string;
  filename: string;
  baseUrl: string;
  productUrl: string;
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

  baseUrl = "https://photoslibrary.googleapis.com/v1/mediaItems";

  constructor({ googleOauth }: { googleOauth: GoogleOauthService }) {
    this.googleOauth = googleOauth;
  }

  static async create() {
    const googleOauth = await GoogleOauthService.create();
    const instance = new GooglePhotoService({ googleOauth });
    return instance;
  }

  async headers() {
    const accessToken = await this.googleOauth.accessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };
    return headers;
  }

  async search({
    date,
    pageToken,
    pageSize,
  }: {
    date: { year: number; month: number; day: number };
    pageToken?: string;
    pageSize: number;
  }) {
    const requestBody = {
      pageSize,
      pageToken,
      filters: {
        dateFilter: {
          dates: [date],
        },
      },
    };

    const url = `${this.baseUrl}:search`;

    const headers = await this.headers();

    const res = await axios.post<SearchResponse>(url, requestBody, {
      headers,
    });

    const items = res.data.mediaItems;
    console.log("push new array with ", items);
   

    return {
      items,
      pageToken: res.data.nextPageToken,
    };
  }

  async download({ item }: { item: MediaItem }) {
    const baseUrl = item.baseUrl;
    console.log("start download", item.filename, item.mediaMetadata);
    const headers = await this.headers();

    let downloadSuffix = "d";
    let type: "video" | "image" = "image";

    if (item.mimeType.startsWith("video")) {
      downloadSuffix = "dv";
      type = "video";
    }

    const response = await axios.get(`${baseUrl}=${downloadSuffix}`, {
      responseType: "arraybuffer",
      headers,
    });

    return {
      buffer: Buffer.from(response.data),
      type,
      ...item,
    };
  }
}
