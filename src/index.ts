/**
 * @license MIT
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.0
 * 
 * Main library entry point
 */

import { runCLI } from './cli/index';

export const main = () => {
  runCLI();
};

// Export core functionality for programmatic use if needed in the future
export * from './core/analyzer';
export * from './core/parser';
export * from './core/security';
export * from './core/fixer';
export * from './core/generator';
export * from './core/scanner';
export * from './core/validation';
