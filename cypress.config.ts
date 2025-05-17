import { defineConfig } from 'cypress';
import { configureCodeCoverage } from '@cypress/code-coverage/task';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    videoCompression: 32,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    screenshotOnRunFailure: true,
    experimentalStudio: true,
    retries: {
      runMode: 2,
      openMode: 0
    },
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    watchForFileChanges: false,
    chromeWebSecurity: false,
    modifyObstructiveCode: false,
    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
      charts: true,
      reportPageTitle: 'PPTTranslator E2E Test Report',
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
      overwrite: true,
      html: true,
      json: true
    },
    env: {
      coverage: true,
      codeCoverage: {
        exclude: [
          'cypress/**/*.*',
          'coverage/**/*.*',
          '**/*.config.*',
          '**/public/**/*.*'
        ]
      }
    },
    setupNodeEvents(on, config) {
      configureCodeCoverage(on, config);
      require('cypress-mochawesome-reporter/plugin')(on);
      
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        table(message) {
          console.table(message);
          return null;
        }
      });

      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--no-sandbox');
        }
        return launchOptions;
      });

      return config;
    }
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
      webpackConfig: {
        devtool: 'source-map',
        module: {
          rules: [
            {
              test: /\.(ts|tsx)$/,
              exclude: [/node_modules/],
              use: {
                loader: 'swc-loader',
                options: {
                  jsc: {
                    parser: {
                      syntax: 'typescript',
                      tsx: true
                    },
                    transform: {
                      react: {
                        runtime: 'automatic'
                      }
                    }
                  },
                  env: {
                    targets: {
                      node: 18
                    }
                  },
                  module: {
                    type: 'es6'
                  },
                  sourceMaps: true
                }
              }
            }
          ]
        }
      }
    },
    specPattern: 'cypress/component/**/*.cy.ts',
    supportFile: 'cypress/support/component.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      configureCodeCoverage(on, config);
      require('cypress-mochawesome-reporter/plugin')(on);
      return config;
    }
  }
});
