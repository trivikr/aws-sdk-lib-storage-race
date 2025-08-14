import { PassThrough } from "node:stream";

import {
  CreateBucketCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import pTimeout from "p-timeout";
import dotenv from "dotenv";

dotenv.config();

const BUCKET_NAME = process.env.TEST_BUCKET_NAME;

class LoggingHttpHandler {
  constructor(options) {
    this.innerHandler = new NodeHttpHandler(options);
  }

  async handle(request, options) {
    console.log(`sending request: ${request.method} for ${request.path}`);
    const response = await this.innerHandler.handle(request, options);
    console.log(`received response: ${request.method} for ${request.path}`);

    return response;
  }
}

const s3Client = new S3Client({
  endpoint: process.env.AWS_S3_ENDPOINT,
  requestHandler: new LoggingHttpHandler(),
});

async function ensureBucketExists() {
  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
  } catch (e) {
    if (e.name !== "BucketAlreadyOwnedByYou") {
      throw e;
    }
  }
}

let sequenceNumber = 0;

async function uploadStream(key, body) {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
    },
  });

  await upload.done();
  return key;
}

async function downloadStream(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  // consume the downloaded stream.
  return response.Body.transformToString();
}

export async function exportStuff() {
  const writer = new PassThrough();
  writer.end();
  const key = `object_${sequenceNumber++}`;
  await uploadStream(key, writer);
  await downloadStream(key);
}

await ensureBucketExists();

while (true) {
  await pTimeout(exportStuff(), { milliseconds: 5_000 });
}
