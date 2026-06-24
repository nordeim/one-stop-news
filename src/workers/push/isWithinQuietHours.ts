import { DateTime } from "luxon";

interface UserPreferences {
  pushQuietStart: string | null;
  pushQuietEnd: string | null;
  briefingTimezone: string | null;
}

/**
 * isWithinQuietHours — DST-safe evaluation of push notification quiet hours.
 *
 * Uses luxon for timezone conversion, ensuring correct handling of DST
 * transitions. Returns true if the user should NOT receive a notification.
 *
 * @param preferences — User push notification preferences
 * @returns true if within quiet hours (user should NOT be notified)
 */
export function isWithinQuietHours(
  preferences: UserPreferences,
  nowUtc: Date,
): boolean {
  // Fail open if preferences are incomplete
  if (
    !preferences.pushQuietStart ||
    !preferences.pushQuietEnd ||
    !preferences.briefingTimezone
  ) {
    return false;
  }

  // Convert current UTC time to the user's local timezone
  const localNow = DateTime.fromJSDate(nowUtc, {
    zone: preferences.briefingTimezone,
  });

  // Validate timezone
  if (!localNow.isValid) {
    console.warn(
      `[QuietHours] Invalid timezone: ${preferences.briefingTimezone}`,
    );
    return false;
  }

  // Parse quiet hours start/end
  const [startHour, startMinute] = preferences.pushQuietStart
    .split(":")
    .map(Number);
  const [endHour, endMinute] = preferences.pushQuietEnd.split(":").map(Number);

  const startMinutes = (startHour ?? 0) * 60 + (startMinute ?? 0);
  const endMinutes = (endHour ?? 0) * 60 + (endMinute ?? 0);
  const nowMinutes = localNow.hour * 60 + localNow.minute;

  // Handle overnight wrap (e.g., 22:00 → 07:00)
  if (startMinutes > endMinutes) {
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }

  // Handle same-day range (e.g., 14:00 → 16:00)
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}
