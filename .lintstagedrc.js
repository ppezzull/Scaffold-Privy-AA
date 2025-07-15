const path = require("path");

const buildNextEslintCommand = (filenames) =>
  `yarn next:lint --fix --file ${filenames
    .map((f) => path.relative(path.join("packages", "nextjs"), f))
    .join(" --file ")}`;

const checkTypesNextCommand = () => "yarn next:check-types";

const buildHardhatEslintCommand = (filenames) =>
  `yarn hardhat:lint-staged --fix ${filenames
    .map((f) => path.relative(path.join("packages", "hardhat"), f))
    .join(" ")}`;

module.exports = {
  "packages/nextjs/**/*.{ts,tsx}": [
    buildNextEslintCommand,
    checkTypesNextCommand,
  ],
  "packages/hardhat/**/*.{ts,tsx}": [buildHardhatEslintCommand],
  "*.{js,ts,jsx,tsx,json,md}": (filenames) => {
    // Filter out library files and problematic files
    const filteredFiles = filenames.filter(
      (filename) => 
        !filename.includes("node_modules") &&
        !filename.includes("packages/foundry/lib/") &&
        !filename.includes("packages/foundry/broadcast/") &&
        !filename.includes("packages/foundry/cache/") &&
        !filename.includes("packages/foundry/out/") &&
        !filename.includes("README copy.md") // Remove problematic file
    );
    
    if (filteredFiles.length === 0) return [];
    
    return `prettier --log-level warn --ignore-path .gitignore --write ${filteredFiles.join(" ")}`;
  },
  "*.sol": ["forge fmt"]
};
