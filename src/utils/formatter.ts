/**
 * @license MIT + Commons Clause
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.5
 */

/**
 * JSON output structure for validation results
 * Used with --json flag for CI/CD integration and automation
 */
export interface JsonOutputResult {
  status: 'success' | 'fail';
  sync_percentage: number;
  missing: string[];
  extra: string[];
  total_in_example: number;
  total_in_target: number;
  file_checked: string;
  template: string;
  security_warnings: string[];
  timestamp: string;
}

/**
 * Format validation results as JSON
 * Converts validation results into structured JSON output for programmatic consumption
 * @param missingVars List of variables missing from target file
 * @param extraVars List of variables in target but not in example
 * @param exampleVarCount Total number of variables in example file
 * @param targetVarCount Total number of variables in target file
 * @param targetPath Path to the target .env file
 * @param examplePath Path to the example .env file
 * @param securityWarnings List of security warnings detected
 * @returns Structured JSON object with validation results
 */
export function formatAsJson(
  missingVars: string[],
  extraVars: string[],
  exampleVarCount: number,
  targetVarCount: number,
  targetPath: string,
  examplePath: string,
  securityWarnings: string[] = []
): JsonOutputResult {
  const totalVars = exampleVarCount;
  const matchingVars = totalVars - missingVars.length;
  const syncPercentage = totalVars > 0 ? parseFloat(((matchingVars / totalVars) * 100).toFixed(1)) : 100;

  return {
    status: missingVars.length === 0 ? 'success' : 'fail',
    sync_percentage: syncPercentage,
    missing: missingVars,
    extra: extraVars,
    total_in_example: exampleVarCount,
    total_in_target: targetVarCount,
    file_checked: targetPath,
    template: examplePath,
    security_warnings: securityWarnings,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format output for quiet mode
 * Produces minimal text output showing only errors (missing/extra variables)
 * Used with --quiet flag for minimal logging
 * @param missingVars List of variables missing from target file
 * @param extraVars List of variables in target but not in example
 * @returns Single line string with comma-separated variable names, or empty string if no issues
 */
export function formatQuiet(missingVars: string[], extraVars: string[]): string {
  const output: string[] = [];

  if (missingVars.length > 0) {
    output.push(`Missing: ${missingVars.join(', ')}`);
  }

  if (extraVars.length > 0) {
    output.push(`Extra: ${extraVars.join(', ')}`);
  }

  return output.join('\n');
}
