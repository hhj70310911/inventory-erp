import crypto from "crypto";

const MAX_IMAGES = 15;

function requireCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "缺少 Cloudinary 伺服器設定（CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET）",
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function signParams(
  params: Record<string, string>,
  apiSecret: string,
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + apiSecret).digest("hex");
}

export async function uploadRemoteImage(remoteUrl: string): Promise<string> {
  const { cloudName, apiKey, apiSecret } = requireCloudinaryConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signParams({ timestamp }, apiSecret);

  const body = new FormData();
  body.append("file", remoteUrl);
  body.append("api_key", apiKey);
  body.append("timestamp", timestamp);
  body.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body },
  );

  const result = (await response.json()) as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message ?? "Cloudinary 上傳失敗");
  }

  return result.secure_url;
}

export async function uploadRemoteImages(
  remoteUrls: string[],
): Promise<string[]> {
  const urls = remoteUrls.filter(Boolean).slice(0, MAX_IMAGES);
  const uploaded: string[] = [];

  for (const url of urls) {
    uploaded.push(await uploadRemoteImage(url));
  }

  return uploaded;
}
