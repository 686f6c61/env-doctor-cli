import { analyzeEnv } from '../../src/core/analyzer';
import { ParseResult } from '../../src/core/parser';

const createMockResult = (vars: Record<string, any>): ParseResult => ({
  variables: vars,
  raw: '',
  lines: []
});

describe('Analyzer Core', () => {
  it('should detect missing variables', () => {
    const target = createMockResult({ EXISTING: { key: 'EXISTING', value: '1', line: 1, isQuoted: false } });
    const example = createMockResult({
      EXISTING: { key: 'EXISTING', value: '1', line: 1, isQuoted: false },
      MISSING_VAR: { key: 'MISSING_VAR', value: '', line: 2, isQuoted: false }
    });

    const result = analyzeEnv(target, example);
    
    expect(result.missing).toContain('MISSING_VAR');
    expect(result.synced).toContain('EXISTING');
    expect(result.percentage).toBe(50);
  });

  it('should detect extra variables', () => {
    const target = createMockResult({ EXTRA_VAR: { key: 'EXTRA_VAR', value: '1', line: 1, isQuoted: false } });
    const example = createMockResult({});

    const result = analyzeEnv(target, example);
    
    expect(result.extra).toContain('EXTRA_VAR');
  });

  it('should handle 100% sync', () => {
    const target = createMockResult({ VAR1: { key: 'VAR1', value: '1', line: 1, isQuoted: false } });
    const example = createMockResult({ VAR1: { key: 'VAR1', value: '', line: 1, isQuoted: false } });

    const result = analyzeEnv(target, example);
    
    expect(result.missing.length).toBe(0);
    expect(result.percentage).toBe(100);
  });

  // Coverage tests
  it('should handle null template (return 100% sync assumption)', () => {
    const target = createMockResult({ VAR1: { key: 'VAR1', value: '1', line: 1, isQuoted: false } });
    const result = analyzeEnv(target, null);

    expect(result.percentage).toBe(100);
    expect(result.missing).toHaveLength(0);
    expect(result.extra).toContain('VAR1');
  });

  it('should handle null target (return 0% sync)', () => {
    const example = createMockResult({ VAR1: { key: 'VAR1', value: '1', line: 1, isQuoted: false } });
    const result = analyzeEnv(null, example);

    expect(result.percentage).toBe(0);
    expect(result.missing).toContain('VAR1');
  });

  it('should handle empty template (100% if target empty)', () => {
     const target = createMockResult({});
     const example = createMockResult({});
     const result = analyzeEnv(target, example);
     
     expect(result.percentage).toBe(100);
  });

  // Edge case: Template is null but target is also null
  it('should handle both null', () => {
    const result = analyzeEnv(null, null);
    // Logic: if template is null, we return "template missing" struct
    // which effectively says 100% sync because nothing is required.
    expect(result.percentage).toBe(100);
    expect(result.missing).toHaveLength(0);
  });

  // Edge case: Empty template but target has vars -> 100% sync (nothing required)
  it('should handle empty template with variables in target', () => {
      const target = createMockResult({ EXTRA: { key: 'EXTRA', value: '1', line: 1, isQuoted: false } });
      const example = createMockResult({});
      const result = analyzeEnv(target, example);
      expect(result.percentage).toBe(100);
      expect(result.extra).toContain('EXTRA');
  });
});
