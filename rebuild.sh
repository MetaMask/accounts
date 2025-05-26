#!/bin/bash -x

yarn build
rsync -av --delete packages/keyring-api/dist/ ~/code/metamask-mobile/node_modules/@metamask/keyring-api/dist
rsync -av --delete packages/eth-snap-keyring/dist/ ~/code/metamask-mobile/node_modules/@metamask/eth-snap-keyring/dist
