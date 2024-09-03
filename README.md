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

After some time, the script tends to lock up and fail while attempting to initiate a download stream. The output typically looks like this:

```sh
❯ npm start

> aws-sdk-lib-storage-race@1.0.0 start
> node index.js

Downloading batch with key object_0...
Downloaded batch with key object_0
Downloading batch with key object_1...
Downloaded batch with key object_1
Export finished
Downloading batch with key object_3...
Downloaded batch with key object_3
Downloading batch with key object_4...
Downloaded batch with key object_4
Export finished
Downloading batch with key object_6...
Downloaded batch with key object_6
Downloading batch with key object_7...
Downloaded batch with key object_7
Export finished
Downloading batch with key object_9...
Downloaded batch with key object_9
Downloading batch with key object_10...
Downloaded batch with key object_10
Export finished
Downloading batch with key object_12...
Downloaded batch with key object_12
Downloading batch with key object_13...
Downloaded batch with key object_13
Export finished
Downloading batch with key object_15...
Downloaded batch with key object_15
Downloading batch with key object_16...
Downloaded batch with key object_16
Export finished
Downloading batch with key object_18...
Downloaded batch with key object_18
Downloading batch with key object_19...
Downloaded batch with key object_19
Export finished
Downloading batch with key object_21...
file:///path/to/repo/clone/node_modules/p-timeout/index.js:70
                const timeoutError = new TimeoutError();
                                     ^

TimeoutError: Promise timed out after 5000 milliseconds
    at file:///path/to/repo/clone/node_modules/p-timeout/index.js:70:24
    at new Promise (<anonymous>)
    at pTimeout (file:////path/to/repo/clone/node_modules/p-timeout/index.js:48:25)
    at file:///path/to/repo/clone/index.js:107:9
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)

Node.js v20.15.0
```
