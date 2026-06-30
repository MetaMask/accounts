import type { Infer } from '@metamask/superstruct';
import {
  array,
  exactOptional,
  object,
  record,
  string,
  union,
} from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

export const SnapMessageStruct = object({
  method: string(),
  params: exactOptional(union([array(JsonStruct), record(string(), JsonStruct)])),
});

/**
 * Message sent by the snap to manage accounts and requests.
 */
export type SnapMessage = Infer<typeof SnapMessageStruct>;
