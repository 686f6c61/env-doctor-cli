/**
 * @license MIT + Commons Clause
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.5
 */

import { ParseResult, EnvVar } from './parser';

export interface EnvDifference {
  missing: string[]; // Variables in example but missing in target
  extra: string[];   // Variables in target but missing in example (obsolete?)
  mismatch: string[]; // Variables present in both but maybe with different types (future feature)
  synced: string[];
  totalExample: number;
  totalTarget: number;
  percentage: number;
}

/**
 * Analyzes differences between two environment file parsing results
 * @param target The actual environment file (e.g., .env)
 * @param template The template file (e.g., .env.example)
 */
export const analyzeEnv = (target: ParseResult | null, template: ParseResult | null): EnvDifference => {
  if (!template) {
    return {
      missing: [],
      extra: target ? Object.keys(target.variables) : [],
      mismatch: [],
      synced: [],
      totalExample: 0,
      totalTarget: target ? Object.keys(target.variables).length : 0,
      percentage: 100 // No template means technically "nothing missing"
    };
  }

  if (!target) {
    return {
      missing: Object.keys(template.variables),
      extra: [],
      mismatch: [],
      synced: [],
      totalExample: Object.keys(template.variables).length,
      totalTarget: 0,
      percentage: 0
    };
  }

  const targetKeys = new Set(Object.keys(target.variables));
  const templateKeys = new Set(Object.keys(template.variables));

  const missing = [...templateKeys].filter(key => !targetKeys.has(key));
  const extra = [...targetKeys].filter(key => !templateKeys.has(key));
  const synced = [...templateKeys].filter(key => targetKeys.has(key));

  const totalRequired = templateKeys.size;
  const syncedCount = synced.length;
  
  const percentage = totalRequired === 0 ? 100 : Math.round((syncedCount / totalRequired) * 100);

  return {
    missing,
    extra,
    mismatch: [],
    synced,
    totalExample: totalRequired,
    totalTarget: targetKeys.size,
    percentage
  };
};

