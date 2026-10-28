import { describe, it, expect } from 'vitest';
import {
  generateTrackingId,
  generateBatchCode,
  generateTripCode,
} from './index.js';

describe('Common Utils', () => {
  it('should generate tracking ID with correct prefix and format', () => {
    const trackingId = generateTrackingId('AID');
    expect(trackingId).toMatch(/^AID-\d{4}-[A-F0-9]{8}$/);
  });

  it('should generate batch code with prefix and timestamp', () => {
    const batchCode = generateBatchCode('EVT');
    expect(batchCode).toMatch(/^BATCH-EVT-[A-Z0-9]+$/);
  });

  it('should generate trip code with year and random hex', () => {
    const tripCode = generateTripCode();
    expect(tripCode).toMatch(/^TRIP-\d{4}-[A-F0-9]{6}$/);
  });
});
