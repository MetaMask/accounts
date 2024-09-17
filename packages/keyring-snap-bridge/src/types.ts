import type { Infer } from '@metamask/superstruct';
import {
  array,
  object,
  optional,
  record,
  string,
  union,
} from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

export const SnapMessageStruct = object({
  method: string(),
  params: optional(union([array(JsonStruct), record(string(), JsonStruct)])),
});

/**
 * Message sent by the snap to manage accounts and requests.
 */
export type SnapMessage = Infer<typeof SnapMessageStruct>;
