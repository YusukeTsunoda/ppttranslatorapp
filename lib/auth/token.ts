import { randomBytes } from 'crypto';

export async function generateResetToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    randomBytes(32, (err, buf) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(buf.toString('hex'));
    });
  });
}
