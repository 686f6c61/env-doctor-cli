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

    const result = await findEnvFiles(false, 10);

    expect(result.length).toBe(10);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Found 20 environment files'));

    consoleWarnSpy.mockRestore();
  });

  it('should include .env.local files when includeLocal is true', async () => {
    (fg as unknown as jest.Mock).mockResolvedValue(['.env', '.env.local', '.env.dev.local']);

    const files = await findEnvFiles(true);

    expect(files).toContain('.env');
    expect(files).toContain('.env.local');
    expect(files).toContain('.env.dev.local');
  });

  it('should exclude .env.local files by default', async () => {
    (fg as unknown as jest.Mock).mockResolvedValue(['.env', '.env.development']);

    const files = await findEnvFiles(false);

    // The mock will return what we specify, but in real usage fast-glob would filter
    // Just verify the ignore patterns are set correctly
    expect(fg).toHaveBeenCalledWith(
      ['.env', '.env.*'],
      expect.objectContaining({
        ignore: expect.arrayContaining(['.env.local', '.env.*.local'])
      })
    );
  });
});

