export const ENVKeyList = ["INSTAGRAM_PASSWORD", "INSTAGRAM_USERNAME", "PUPPETER_BROWSER_PATH"] as const;

export type ENVKey = (typeof ENVKeyList)[number];

export type ENVModel = Record<ENVKey, string >;
