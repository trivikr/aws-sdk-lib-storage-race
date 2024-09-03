# Reproduce for a race condition around multi-part upload utility in `@aws-sdk/lib-storage`

When using the [multi-part upload
utility](https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-storage), an
empty stream results in a race condition which causes other S3 commands to hang.

## Dependencies

- Node.js

## Steps to reproduce the race condition

1. Clone this repository
1. Install dependencies using `npm ci`
1. Copy `.env.example` to `.env` and add valid values for all the environment variables
1. Run `npm start`

After some time, the script tends to lock up and fail while attempting to initiate a download stream, producing [this kind of output](./example_output.txt).
