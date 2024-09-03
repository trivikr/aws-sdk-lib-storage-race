import { PassThrough } from "node:stream";

import {
  CreateBucketCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { Upload } from "@aws-sdk/lib-storage";
import pTimeout from "p-timeout";
import dotenv from "dotenv";

dotenv.config();

const BUCKET_NAME = "martin-slota-test";

const s3Client = new S3Client({
  endpoint: process.env.AWS_S3_ENDPOINT,
  credentials: fromTemporaryCredentials({
    params: {
      RoleArn: process.env.AWS_ROLE_ARN,
    },
  }),
});

s3Client.middlewareStack.add(
  (next, context) => async (args) => {
    console.log("AWS SDK context", context.clientName, context.commandName);
    console.log("AWS SDK request input", args.input);
    const result = await next(args);
    const { Body, ...rest } = result.output;
    console.log("AWS SDK request output:", { ...rest, Body: "REDACTED" });
    return result;
  },
  {
    name: "MyMiddleware",
    step: "build",
    override: true,
  }
);

async function ensureBucketExists() {
  try {
    await s3Client.send(
      new CreateBucketCommand({ Bucket: BUCKET_NAME, ACL: "public-read" })
    );
  } catch (e) {
    // intentionally ignored
  }
}

let sequenceNumber = 0;

async function uploadStream(body) {
  const key = `object_${sequenceNumber++}`;
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
      console.log(`Downloading batch with key ${batchKey}...`);
      const reader = await downloadStream(batchKey);
      console.log(`Downloaded batch with key ${batchKey}`);
      for await (const data of reader) {
        writer.write(data);
      }
    }

    writer.end();
    await uploadPromise;
  }

  console.log("Export finished");
}

await ensureBucketExists();

while (true) {
  await pTimeout(exportStuff(), { milliseconds: 5_000 });
}
