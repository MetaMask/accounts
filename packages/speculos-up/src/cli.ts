#!/usr/bin/env node

import { ensureBinary } from './download';

ensureBinary()
  .then((binaryPath: string) => {
    console.log(binaryPath);
    return undefined;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
