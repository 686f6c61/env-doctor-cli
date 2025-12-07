import { askConfirmation } from '../../src/utils/prompt';
import readline from 'readline';

jest.mock('readline');

describe('Prompt Utils', () => {
  let mockRl: any;

  beforeEach(() => {
    mockRl = {
      question: jest.fn(),
      close: jest.fn()
    };
    (readline.createInterface as jest.Mock).mockReturnValue(mockRl);
  });

  it('should resolve true for "y"', async () => {
    mockRl.question.mockImplementation((q: string, cb: (ans: string) => void) => {
      cb('y');
    });

    const result = await askConfirmation('Confirm?');
    expect(result).toBe(true);
    expect(mockRl.close).toHaveBeenCalled();
  });

  it('should resolve true for "yes"', async () => {
    mockRl.question.mockImplementation((q: string, cb: (ans: string) => void) => {
      cb('yes');
    });

    const result = await askConfirmation('Confirm?');
    expect(result).toBe(true);
  });

  it('should resolve false for "n"', async () => {
    mockRl.question.mockImplementation((q: string, cb: (ans: string) => void) => {
      cb('n');
    });

    const result = await askConfirmation('Confirm?');
    expect(result).toBe(false);
  });

  it('should resolve false for anything else', async () => {
    mockRl.question.mockImplementation((q: string, cb: (ans: string) => void) => {
      cb('maybe');
    });

    const result = await askConfirmation('Confirm?');
    expect(result).toBe(false);
  });
});

