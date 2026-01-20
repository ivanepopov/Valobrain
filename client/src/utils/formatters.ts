/**
 * Utility functions for formatting values
 */

/**
 * Formats an ISO 8601 duration string (e.g., "PT58M13.1S") to MM:SS format (e.g., "58:13")
 */
export function formatDuration(isoDuration: string): string {
    if (!isoDuration) return '';

    // Match hours, minutes, and seconds from ISO 8601 duration format
    const hoursMatch = isoDuration.match(/(\d+)H/);
    const minutesMatch = isoDuration.match(/(\d+)M/);
    const secondsMatch = isoDuration.match(/([\d.]+)S/);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? Math.round(parseFloat(secondsMatch[1])) : 0;

    // Convert hours to minutes
    const totalMinutes = hours * 60 + minutes;

    // Pad seconds with leading zero if needed
    const paddedSeconds = seconds.toString().padStart(2, '0');

    return `${totalMinutes}:${paddedSeconds}`;
}


export function capitalize(str: string): string {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
