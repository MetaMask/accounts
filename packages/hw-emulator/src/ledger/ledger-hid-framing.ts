 
import createHIDframing from '@ledgerhq/devices/lib/hid-framing';
 
import type { ResponseAcc } from '@ledgerhq/devices/lib/hid-framing';

const PACKET_SIZE = 64;

export type LedgerHidFramingSession = {
  channel: number;
  framing: ReturnType<typeof createHIDframing>;
  acc: ResponseAcc;
};

/**
 * Create a framing session from the first HID frame.
 *
 * @param firstFrame - The first HID frame to initialize the session.
 * @returns A new framing session.
 */
export function createLedgerHidFramingSession(
  firstFrame: Buffer,
): LedgerHidFramingSession {
  const channel = firstFrame.readUInt16BE(0);
  return {
    channel,
    framing: createHIDframing(channel, PACKET_SIZE),
    acc: null,
  };
}

/**
 * Push an incoming HID frame and return the complete APDU when ready.
 *
 * @param session - The framing session.
 * @param frame - The HID frame to push.
 * @returns The complete APDU buffer, or null if more frames are needed.
 */
export function pushLedgerHidFrame(
  session: LedgerHidFramingSession,
  frame: Buffer,
): Buffer | null {
  try {
    session.acc = session.framing.reduceResponse(session.acc, frame);
    const result = session.framing.getReducedResult(session.acc);
    if (result) {
      session.acc = null;
      return result;
    }
    return null;
  } catch (rawError: unknown) {
    const errorId =
      rawError && typeof rawError === 'object' && 'id' in rawError
        ? String((rawError as { id: string }).id)
        : '';
    if (errorId === 'InvalidChannel') {
      return null;
    }
    throw rawError;
  }
}

/**
 * Encode a raw APDU response into HID frames.
 *
 * @param session - The framing session.
 * @param apduResponse - The raw APDU response to encode.
 * @returns An array of HID frame buffers.
 */
export function encodeLedgerHidResponse(
  session: LedgerHidFramingSession,
  apduResponse: Buffer,
): Buffer[] {
  return session.framing.makeBlocks(apduResponse);
}
