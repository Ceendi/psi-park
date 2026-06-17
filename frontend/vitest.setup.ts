// Pin the timezone so date/time rendering is deterministic regardless of the
// runner's locale (CI runs in UTC). The app is single-timezone Europe/Warsaw
// (PLAN §10), so tests assert times in that zone.
process.env.TZ = 'Europe/Warsaw';

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
