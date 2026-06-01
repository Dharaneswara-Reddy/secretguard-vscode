#!/bin/sh
# SecretGuard pre-commit hook template
# This file is written into .git/hooks/pre-commit by the extension.

# SecretGuard managed hook — do not remove this line
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

node "SCANNER_PATH" $STAGED_FILES
RESULT=$?

if [ $RESULT -ne 0 ]; then
  printf "\033[31m[SecretGuard] Commit blocked — secrets or sensitive files detected.\033[0m\n"
  printf "\033[33mRun 'git commit --no-verify' to bypass (not recommended).\033[0m\n"
  exit 1
fi

exit 0
