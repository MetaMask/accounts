#!/bin/bash

readonly BRANCH=feature/monorepo

git branch --delete $BRANCH
git co -b $BRANCH
git push origin $BRANCH "$@"
git push origin --tags
