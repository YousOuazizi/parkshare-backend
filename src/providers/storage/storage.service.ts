import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadResult, DownloadResult } from './interfaces/storage.interface';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: AWS.S3;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    const accessKeyId =
      this.configService.get<string>('AWS_ACCESS_KEY_ID') || 'demo-access-key';
    const secretAccessKey =
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ||
      'demo-secret-key';
    const region = this.configService.get<string>('AWS_REGION') || 'eu-west-3';
    this.bucketName =
      this.configService.get<string>('AWS_S3_BUCKET_NAME') || 'demo-bucket';

    this.s3 = new AWS.S3({
      accessKeyId,
      secretAccessKey,
      region,
    });
  }

  async uploadFile(
    file: Buffer,
    mimetype: string,
    folder = 'uploads',
  ): Promise<UploadResult> {
    const key = `${folder}/${uuidv4()}-${Date.now()}`;

    try {
      const result = await this.s3
        .upload({
          Bucket: this.bucketName,
          Key: key,
          Body: file,
          ContentType: mimetype,
          ACL: 'public-read',
        })
        .promise();

      return {
        url: result.Location,
        key: key,
        mimetype,
        size: file.length,
      };
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(key: string): Promise<DownloadResult> {
    try {
      const result = await this.s3
        .getObject({
          Bucket: this.bucketName,
          Key: key,
        })
        .promise();

      return {
        data: result.Body as Buffer,
        mimetype: result.ContentType || 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error(
        `Error downloading file: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3
        .deleteObject({
          Bucket: this.bucketName,
          Key: key,
        })
        .promise();
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  generateSignedUrl(key: string, expiresIn = 3600): string {
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn,
    });
  }
}
