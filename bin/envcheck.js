#!/usr/bin/env node

/**
 * envcheck - The ESLint for your .env files
 *
 * @license MIT
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.0
 */

// This file is the executable entry point
// It imports the compiled logic from lib/index.js

try {
  const cli = require('../lib/index.js');
  if (cli && typeof cli.main === 'function') {
    cli.main();
  } else {
    // Simple fallback if the library doesn't export main directly or there is an issue
    require('../lib/cli/index.js');
  }
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('Error: Project build not found.');
    console.error('Run "npm run build" before using the CLI.');
    process.exit(1);
  }
  console.error('Unexpected error:', error);
  process.exit(1);
}
