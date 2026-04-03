import { useMemo } from "react";

// static boolean when UTC 11:00 until 11:15
export function useIsDT() {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  return useMemo(() => {
    return hour === 11 && minute <= 0 && minute >= 15;
  }, [hour, minute]);
}

// same as above, but for non-react stuff
export function isDT() {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  return hour === 11 && minute <= 0 && minute >= 15;
}
