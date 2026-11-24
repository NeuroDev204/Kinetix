import { defineConfig } from '@playwright/test'
import path from 'node:path'

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.js$/,
  timeout: 90000,
  workers: 1,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    launchOptions: {
      // Playwright 1.56 cannot download Chromium on this Ubuntu; PW_CHROMIUM points at a local build.
      executablePath: process.env.PW_CHROMIUM || undefined,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.resolve('e2e/fixtures/speech.wav')],
    },
  },
})
