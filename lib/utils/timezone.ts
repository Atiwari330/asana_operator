/**
 * Timezone conversion utilities for handling Eastern Time to UTC conversion
 */

/**
 * Convert a local Eastern Time datetime string to UTC ISO format
 *
 * @param localDateTime - Local datetime string in format "YYYY-MM-DDTHH:mm:ss"
 * @param timezone - IANA timezone string (defaults to America/New_York for Eastern Time)
 * @returns UTC datetime string in ISO 8601 format with Z suffix
 *
 * @example
 * convertLocalToUTC("2025-09-15T10:00:00")
 * // Returns "2025-09-15T14:00:00.000Z" (10 AM EDT = 2 PM UTC)
 */
export function convertLocalToUTC(
  localDateTime: string | null | undefined,
  timezone: string = 'America/New_York'
): string | undefined {
  if (!localDateTime) {
    return undefined;
  }

  try {
    // Parse the local datetime string
    // Add timezone context by creating a date with the timezone offset
    const localDate = new Date(localDateTime);

    // Create a formatter for the specific timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Get the parts of the date in the target timezone
    const parts = formatter.formatToParts(localDate);
    const dateParts: { [key: string]: string } = {};
    parts.forEach(part => {
      if (part.type !== 'literal') {
        dateParts[part.type] = part.value;
      }
    });

    // Reconstruct the date in the local timezone
    const localDateInTimezone = new Date(
      `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`
    );

    // Calculate the timezone offset
    // For Eastern Time: EDT (summer) = UTC-4, EST (winter) = UTC-5
    const offsetCalculator = new Date(localDateTime);
    const januaryOffset = new Date(offsetCalculator.getFullYear(), 0, 1);
    const julyOffset = new Date(offsetCalculator.getFullYear(), 6, 1);

    // Determine if we're in daylight saving time
    const isDST = offsetCalculator.getTimezoneOffset() < Math.max(
      januaryOffset.getTimezoneOffset(),
      julyOffset.getTimezoneOffset()
    );

    // Eastern Time offset
    const offsetHours = isDST ? 4 : 5; // EDT = UTC-4, EST = UTC-5

    // Parse the local datetime and add the offset to get UTC
    const localTimestamp = new Date(localDateTime).getTime();
    const utcTimestamp = localTimestamp + (offsetHours * 60 * 60 * 1000);
    const utcDate = new Date(utcTimestamp);

    // Return in ISO format with Z suffix
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting timezone:', error);
    // If conversion fails, return the original (assuming it might already be UTC)
    return localDateTime.includes('Z') ? localDateTime : `${localDateTime}.000Z`;
  }
}

/**
 * Simple Eastern Time to UTC converter using fixed offset
 * Use this for predictable Eastern Time conversion
 *
 * @param localDateTime - Local Eastern Time datetime string
 * @returns UTC datetime string in ISO 8601 format
 */
export function convertEasternToUTC(localDateTime: string | null | undefined): string | undefined {
  if (!localDateTime) {
    return undefined;
  }

  try {
    // Parse the datetime string and extract components
    // We need to treat this as Eastern Time, not the server's local time
    const [datePart, timePart] = localDateTime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second = 0] = timePart.split(':').map(Number);

    // Check if date is in DST (Daylight Saving Time)
    // DST in US: Second Sunday in March to First Sunday in November
    const monthIndex = month - 1; // JavaScript months are 0-indexed
    const isDST = monthIndex >= 2 && monthIndex < 10; // March (2) through October (9)

    // EDT = UTC-4, EST = UTC-5
    // Eastern is BEHIND UTC, so we ADD hours to Eastern time to get UTC
    const offsetHours = isDST ? 4 : 5;

    // Create a date in UTC by adding the offset to the Eastern time
    // For example: 2 PM EDT + 4 hours = 6 PM UTC
    const utcDate = new Date(Date.UTC(
      year,
      monthIndex,
      day,
      hour + offsetHours,  // Add offset to convert Eastern to UTC
      minute,
      second
    ));

    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting Eastern to UTC:', error);
    return undefined;
  }
}

/**
 * Log timezone conversion for debugging
 */
export function logTimezoneConversion(
  localDateTime: string | null | undefined,
  utcDateTime: string | undefined,
  context: string = ''
): void {
  if (localDateTime && utcDateTime) {
    console.log(`🕐 Timezone Conversion${context ? ` (${context})` : ''}:`);
    console.log(`   Local Eastern: ${localDateTime}`);
    console.log(`   UTC Result:    ${utcDateTime}`);

    // Show the time difference
    const localDate = new Date(localDateTime);
    const utcDate = new Date(utcDateTime);
    const diffHours = (utcDate.getTime() - localDate.getTime()) / (1000 * 60 * 60);
    console.log(`   Offset:        ${diffHours > 0 ? '+' : ''}${diffHours} hours`);
  }
}