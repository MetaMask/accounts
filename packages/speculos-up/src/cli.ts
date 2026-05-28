#!/usr/bin/env node

import { ensureBinary } from './download';

ensureBinary()
  .then((binaryPath) => {
    console.log(binaryPath);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
