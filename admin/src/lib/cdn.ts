export type ManifestAsset = {
  path: string;
  alt?: string;
  width?: number;
  height?: number;
};

export type Manifest = {
  version: string;
  baseUrl: string;
  assets: Record<string, ManifestAsset>;
};

export function getCdnBaseUrl(): string {
  return process.env.CDN_BASE_URL ?? "https://cdn.anants.studio";
}

export function assetUrl(path: string): string {
  const base = getCdnBaseUrl().replace(/\/$/, "");
  const clean = path.replace(/^\/+/, "");
  return `${base}/${clean}`;
}

export function parseManifest(json: unknown): Manifest {
  const m = json as Manifest;
  if (!m || typeof m.version !== "string" || typeof m.baseUrl !== "string" || !m.assets) {
    throw new Error("Invalid manifest.json");
  }
  return m;
}

export const FOLDER_OPTIONS = [
  { value: "media/images", label: "Shared Images" },
  { value: "media/video", label: "Shared Video" },
  { value: "media/audio", label: "Shared Audio" },
  { value: "media/fonts", label: "Shared Fonts" },
  { value: "assets", label: "Portfolio Assets" },
  { value: "assets/posts", label: "Post Images" },
  { value: "assets/icons", label: "Icons" },
] as const;
