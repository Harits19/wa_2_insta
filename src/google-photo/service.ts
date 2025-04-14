import { MB } from "../constants/size";
import GoogleOauthService from "../google-oauth/service";
import axios from "axios";
import * as fs from "fs/promises";

interface MediaItem {
  id: string;
  filename: string;
  baseUrl: string;
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
    end,
    start,
  }: {
    start: { year: number; month: number; day: number };
    end: { year: number; month: number; day: number };
  }) {
    const requestBody = {
      pageSize: 3,
      pageToken: undefined as string | undefined,
      filters: {
        dateFilter: {
          ranges: [{ startDate: start, endDate: end }],
        },
      },
    };

    const url = "https://photoslibrary.googleapis.com/v1/mediaItems:search";
    const mediaItems: MediaItem[] = [];

    do {
      const accessToken = await this.googleOauth.accessToken();

      const headers = { Authorization: `Bearer ${accessToken}` };

      const res = await axios.post<SearchResponse>(url, requestBody, {
        headers,
      });

      const items = res.data.mediaItems;
      console.log("push new array with length ", items.length);
      mediaItems.push(...items);

      requestBody.pageToken = res.data.nextPageToken;
    } while (requestBody.pageToken);

    console.log("final array length", mediaItems);
  }

  async download({ baseUrl }: { baseUrl: string }): Promise<{
    type: "temporary" | "buffer";
    data: Buffer | string;
  }> {
    const accessToken = await this.googleOauth.accessToken();
    const response = await axios.get(`${baseUrl}=d`, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const result = Buffer.from(response.data);

    const tempFileSizeThreshold = 5 * MB;

    if (result.length > tempFileSizeThreshold) {
      const outputPath = `/temporary/${crypto.randomUUID()}`;
      await fs.writeFile(outputPath, result);

      return {
        type: "temporary",
        data: outputPath,
      };
    } else {
      return {
        type: "buffer",
        data: result,
      };
    }
  }
}
