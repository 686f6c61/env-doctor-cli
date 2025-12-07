import { findEnvFiles } from '../../src/core/scanner';
import fg from 'fast-glob';

jest.mock('fast-glob');

describe('Scanner Core', () => {
  it('should return found files', async () => {
    (fg as unknown as jest.Mock).mockResolvedValue(['.env', '.env.local']);
    
    const files = await findEnvFiles();
    
    expect(files).toHaveLength(2);
    expect(files).toContain('.env');
    expect(files).toContain('.env.local');
    expect(fg).toHaveBeenCalledWith(
      ['.env', '.env.*'],
      expect.objectContaining({ dot: true })
    );
  });

  it('should handle errors gracefully', async () => {
    (fg as unknown as jest.Mock).mockRejectedValue(new Error('Glob error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const files = await findEnvFiles();

    expect(files).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should limit files when exceeding MAX_FILES_SCAN', async () => {
    // Create an array with more than default limit (50)
    const manyFiles = Array.from({ length: 60 }, (_, i) => `.env.${i}`);
    (fg as unknown as jest.Mock).mockResolvedValue(manyFiles);

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const files = await findEnvFiles();

    expect(files.length).toBe(50); // Default MAX_FILES_SCAN
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Found 60 environment files'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('only processing first 50'));

    consoleWarnSpy.mockRestore();
  });

  it('should respect custom maxFiles limit', async () => {
    const files = Array.from({ length: 20 }, (_, i) => `.env.${i}`);
    (fg as unknown as jest.Mock).mockResolvedValue(files);

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await findEnvFiles(10);

    expect(result.length).toBe(10);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Found 20 environment files'));

    consoleWarnSpy.mockRestore();
  });
});

