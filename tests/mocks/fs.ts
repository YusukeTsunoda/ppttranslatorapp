import { Readable } from 'stream';

export const mockFs = {
  createReadStream: jest.fn().mockImplementation((path: string) => {
    return new Readable({
      read() {
        this.push('test data');
        this.push(null);
      }
    });
  }),
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('test data')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
};

jest.mock('fs', () => mockFs); 