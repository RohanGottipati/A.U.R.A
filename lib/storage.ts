import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3 = new S3Client({
  endpoint: process.env.VULTR_STORAGE_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.VULTR_STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.VULTR_STORAGE_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.VULTR_STORAGE_BUCKET!;

export const storage = {
  async uploadImage(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }));
    return `${process.env.VULTR_STORAGE_ENDPOINT}/${BUCKET}/${key}`;
  },

  async uploadScene(key: string, sceneData: object): Promise<string> {
    const body = JSON.stringify(sceneData, null, 2);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      ACL: 'public-read',
    }));
    return `${process.env.VULTR_STORAGE_ENDPOINT}/${BUCKET}/${key}`;
  },

  async getScene(key: string): Promise<object> {
    const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  },

  getPublicUrl(key: string): string {
    return `${process.env.VULTR_STORAGE_ENDPOINT}/${BUCKET}/${key}`;
  }
};
