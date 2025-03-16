import { defineConfig } from 'cypress';
import { promises as fs } from 'fs';
import path from 'path';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3002',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    taskTimeout: 10000,
    retries: {
      runMode: 1,
      openMode: 0
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'cypress/results',
      overwrite: false,
      html: false,
      json: true,
      charts: true,
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false
    },
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3003/api',
      TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'tsunotsunoda@gmail.com',
      TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'Tsuno202502',
      failOnStatusCode: false
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

      // テスト実行前にレポートディレクトリを作成
      on('before:run', async () => {
        try {
          const resultsDir = path.resolve(process.cwd(), 'cypress/results');
          const reportsDir = path.resolve(process.cwd(), 'cypress/reports');
          
          await fs.mkdir(resultsDir, { recursive: true });
          await fs.mkdir(reportsDir, { recursive: true });
          
          console.log('レポートディレクトリを作成しました');
        } catch (error) {
          console.error('レポートディレクトリの作成に失敗しました:', error);
        }
      });

      return config;
    }
  }
});