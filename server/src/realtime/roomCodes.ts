import { randomInt } from "crypto";
import { RULES } from "../engine/rules";

// Uppercase letters and digits, excluding ambiguous O/0/I/1.
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(isTaken: (code: string) => boolean): string {
  let code: string;
  let attempts = 0;
  do {
    code = "";
    for (let i = 0; i < RULES.roomCodeLength; i++) {
      code += ROOM_CODE_CHARS[randomInt(0, ROOM_CODE_CHARS.length)];
    }
    attempts += 1;
  } while (isTaken(code) && attempts < 100);
  return code;
}

/** Strips anything but the allowed alphabet and upper-cases, for input sanitization. */
export function normalizeRoomCode(input: string): string {
  return (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, RULES.roomCodeLength);
}
