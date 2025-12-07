/**
 * @license MIT
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.0
 */

import readline from 'readline';

/**
 * Asks the user a yes/no question
 * @param question The text to ask
 * @returns Promise resolving to true if yes, false if no
 */
export const askConfirmation = (question: string): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

