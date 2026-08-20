// lint-staged.config.js
module.exports = {
  '**/*.ts': ['eslint --fix --max-warnings 0', 'prettier --write'],
  '**/*.{json,md,yml}': ['prettier --write'],
};
