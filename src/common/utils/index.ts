import crypto from 'node:crypto';

export function generateTrackingId(prefix = 'AID'): string {
  const year = new Date().getFullYear();
  const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${year}-${randomStr}`;
}

export function generateBatchCode(eventCode = 'EVT'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `BATCH-${eventCode}-${timestamp}`;
}

export function generateTripCode(): string {
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRIP-${new Date().getFullYear()}-${randomStr}`;
}
