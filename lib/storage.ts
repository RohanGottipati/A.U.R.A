import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { getEnv } from './env';

let s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3) {
    const env = getEnv();
    s3 = new S3Client({
      endpoint: env.VULTR_STORAGE_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: env.VULTR_STORAGE_ACCESS_KEY,
        secretAccessKey: env.VULTR_STORAGE_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }

  return s3;
}

export const storage = {
  async uploadImage(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const env = getEnv();
    await getS3Client().send(new PutObjectCommand({
      Bucket: env.VULTR_STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }));
    return `${env.VULTR_STORAGE_ENDPOINT}/${env.VULTR_STORAGE_BUCKET}/${key}`;
  },

  async uploadScene(key: string, sceneData: object): Promise<string> {
    const env = getEnv();
    const body = JSON.stringify(sceneData, null, 2);
    await getS3Client().send(new PutObjectCommand({
      Bucket: env.VULTR_STORAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      ACL: 'public-read',
    }));
    return `${env.VULTR_STORAGE_ENDPOINT}/${env.VULTR_STORAGE_BUCKET}/${key}`;
  },

  async getScene(key: string): Promise<object> {
    const { VULTR_STORAGE_BUCKET } = getEnv();
    const response = await getS3Client().send(new GetObjectCommand({ Bucket: VULTR_STORAGE_BUCKET, Key: key }));
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  },

  getPublicUrl(key: string): string {
    const env = getEnv();
    return `${env.VULTR_STORAGE_ENDPOINT}/${env.VULTR_STORAGE_BUCKET}/${key}`;
  }
};
