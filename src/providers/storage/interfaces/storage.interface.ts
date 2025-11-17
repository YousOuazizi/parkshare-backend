export interface UploadResult {
  url: string;
  key: string;
  mimetype: string;
  size: number;
}

export interface DownloadResult {
  data: Buffer;
  mimetype: string;
}
