import { PassThrough } from "node:stream";

import {
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
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

async function uploadStream(body) {
  const key = `object_${sequenceNumber++}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
  });

  await s3Client.send(command);
  return key;
}

async function downloadStream(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  return response.Body;
}

export async function exportStuff() {
  const batchKeys = [];

  // upload one batch of data
  {
    const writer = new PassThrough();
    const uploadPromise = uploadStream(writer);

    // write some data
    writer.write("some data");
    writer.end();

    batchKeys.push(await uploadPromise);
  }

  // upload another batch of data
  {
    const writer = new PassThrough();
    const uploadPromise = uploadStream(writer);

    // whoops, it turns out there is no data to write
    writer.end();

    batchKeys.push(await uploadPromise);
  }

  // concatenate all the batches into a single S3 object
  {
    const writer = new PassThrough();
    const uploadPromise = uploadStream(writer);

    for (const batchKey of batchKeys) {
      const reader = await downloadStream(batchKey);
      for await (const data of reader) {
        writer.write(data);
      }
    }

    writer.end();
    await uploadPromise;
  }
}

await ensureBucketExists();

while (true) {
  await pTimeout(exportStuff(), { milliseconds: 5_000 });
}
