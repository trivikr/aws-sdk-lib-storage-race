# Reproduce for a race condition around multi-part upload utility in `@aws-sdk/lib-storage`

When using the [multi-part upload
utility](https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-storage), an
empty stream results in a race condition which causes other S3 commands to hang.

## Steps to reproduce the race condition against Localstack

1. Clone this repository
1. Switch to Node.js version 20.15.0 using `fnm use`
1. Install dependencies using `npm ci`
1. Set up environment variables by running `cp .env.localstack .env`
1. Run `npm run start-localstack`

After some time, the script tends to lock up and fail while attempting to initiate a download stream, producing [this kind of output](./example_output.txt).

## Steps to reproduce the race condition against AWS

1. Clone this repository
1. Switch to Node.js version 20.15.0 using `fnm use`
1. Install dependencies using `npm ci`
1. Export AWS credentials and region (for profile `my-profile`) into `.env` using

   ```sh
   aws configure export-credentials --profile my-profile --format env | sed -e 's/^export //' > .env
   echo "AWS_REGION=$(aws configure get region --profile my-profile)" >> .env
   ```

1. Run `npm run start-aws`

After some time, the script tends to lock up and fail while attempting to initiate a download stream, producing [this kind of output](./example_output.txt).
