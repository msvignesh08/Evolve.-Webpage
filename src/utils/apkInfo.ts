export interface ApkFileEntrySummary {
  name: string;
  detail: string;
  size: string;
}

export interface ApkInfoResponse {
  available: boolean;
  fileName: string;
  sizeBytes: number;
  sha256: string | null;
  packageName: string | null;
  versionName: string | null;
  versionCode: number | null;
  minAndroidLabel: string | null;
  fileCount: number | null;
  entries: ApkFileEntrySummary[] | null;
}
