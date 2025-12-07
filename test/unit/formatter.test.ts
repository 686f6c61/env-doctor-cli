import { formatAsJson, formatQuiet } from '../../src/utils/formatter';

describe('Formatter Utils', () => {
  describe('formatAsJson', () => {
    it('should format successful validation as JSON', () => {
      const result = formatAsJson(
        [],
        [],
        10,
        10,
        '.env',
        '.env.example',
        []
      );

      expect(result.status).toBe('success');
      expect(result.sync_percentage).toBe(100);
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual([]);
    });

    it('should format failed validation as JSON', () => {
      const result = formatAsJson(
        ['API_KEY', 'DB_HOST'],
        [],
        10,
        8,
        '.env',
        '.env.example',
        []
      );

      expect(result.status).toBe('fail');
      expect(result.sync_percentage).toBe(80);
      expect(result.missing).toEqual(['API_KEY', 'DB_HOST']);
    });

    it('should include security warnings', () => {
      const result = formatAsJson(
        [],
        [],
        10,
        10,
        '.env',
        '.env.example',
        ['.env is not in .gitignore']
      );

      expect(result.security_warnings).toHaveLength(1);
      expect(result.security_warnings[0]).toContain('.gitignore');
    });

    it('should include timestamp', () => {
      const result = formatAsJson([], [], 10, 10, '.env', '.env.example', []);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    it('should handle zero variables in example (division by zero protection)', () => {
      const result = formatAsJson([], [], 0, 5, '.env', '.env.example');
      expect(result.sync_percentage).toBe(100);
      expect(result.total_in_example).toBe(0);
    });
  });

  describe('formatQuiet', () => {
    it('should format missing variables', () => {
      const output = formatQuiet(['API_KEY', 'DB_HOST'], []);
      expect(output).toContain('Missing: API_KEY, DB_HOST');
    });

    it('should format extra variables', () => {
      const output = formatQuiet([], ['OLD_VAR']);
      expect(output).toContain('Extra: OLD_VAR');
    });

    it('should format both missing and extra', () => {
      const output = formatQuiet(['API_KEY'], ['OLD_VAR']);
      expect(output).toContain('Missing: API_KEY');
      expect(output).toContain('Extra: OLD_VAR');
    });

    it('should return empty string when no issues', () => {
      const output = formatQuiet([], []);
      expect(output).toBe('');
    });
  });
});
