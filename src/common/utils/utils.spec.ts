import { describe, it, expect } from 'vitest';
import {
  generateTrackingId,
  generateBatchCode,
  generateTripCode,
} from './index.js';

describe('Common Utils', () => {
  describe('generateTrackingId (KAN-17 DoD Verification)', () => {
    it('should generate tracking ID with correct prefix and format', () => {
      const trackingId = generateTrackingId('AID');
      expect(trackingId).toMatch(/^AID-\d{4}-[A-F0-9]{8}$/);

      const donTrackingId = generateTrackingId('DON');
      expect(donTrackingId).toMatch(/^DON-\d{4}-[A-F0-9]{8}$/);
    });

    it('should generate unique tracking IDs without collisions (10,000 samples)', () => {
      const SAMPLE_SIZE = 10_000;
      const ids = new Set<string>();

      for (let i = 0; i < SAMPLE_SIZE; i++) {
        const id = generateTrackingId('DON');
        ids.add(id);
      }

      // Acceptance Criteria: Zero collision among 10,000 generated IDs
      expect(ids.size).toBe(SAMPLE_SIZE);
    });

    it('should generate non-sequential tracking IDs with random hex entropy', () => {
      const id1 = generateTrackingId('AID');
      const id2 = generateTrackingId('AID');
      expect(id1).not.toBe(id2);

      const hexPart1 = id1.split('-')[2];
      const hexPart2 = id2.split('-')[2];
      // Consecutive IDs should not have sequential numeric or hex values
      expect(hexPart1).not.toBe(hexPart2);
    });
  });

  describe('generateBatchCode', () => {
    it('should generate batch code with prefix and timestamp', () => {
      const batchCode = generateBatchCode('EVT');
      expect(batchCode).toMatch(/^BATCH-EVT-[A-Z0-9]+$/);
    });
  });

  describe('generateTripCode', () => {
    it('should generate trip code with year and random hex', () => {
      const tripCode = generateTripCode();
      expect(tripCode).toMatch(/^TRIP-\d{4}-[A-F0-9]{6}$/);
    });
  });
});
