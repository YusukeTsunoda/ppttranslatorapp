import { defineConfig } from 'cypress';
import { promises as fs } from 'fs';
import path from 'path';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3002',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 30000,
    responseTimeout: 30000,
    taskTimeout: 60000,
    retries: {
      runMode: 2,
      openMode: 0
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'cypress/results',
      overwrite: false,
      html: false,
      json: true
    },
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3003/api',
      TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'tsunotsunoda@gmail.com',
      TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'Tsuno202502'
    },
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--disable-dev-shm-usage');
        }
        return launchOptions;
      });

      on('task', {
        async ensureDir(dirPath: string) {
          try {
            const fullPath = path.resolve(process.cwd(), dirPath);
            await fs.mkdir(fullPath, { recursive: true });
            console.log(`Directory ensured: ${fullPath}`);
            return true;
          } catch (error) {
            console.error(`Error ensuring directory: ${error}`);
            return false;
          }
        },
        log(message: string) {
          console.log(message);
          return null;
        }
      });

      return config;
    }
  }
});