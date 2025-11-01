// ======================================
// Conflict Detection Utility
// ======================================

/**
 * Check if two time ranges overlap
 * @param {Object} session1 - First session with DayOfWeek, StartTime, EndTime
 * @param {Object} session2 - Second session with DayOfWeek, StartTime, EndTime
 * @returns {boolean} - True if sessions conflict
 */
export function sessionsConflict(session1, session2) {
    // Must be on same day
    if (session1.DayOfWeek !== session2.DayOfWeek) {
        return false;
    }
    
    // Convert times to minutes for easy comparison
    const start1 = timeToMinutes(session1.StartTime);
    const end1 = timeToMinutes(session1.EndTime);
    const start2 = timeToMinutes(session2.StartTime);
    const end2 = timeToMinutes(session2.EndTime);
    
    // Check if time ranges overlap
    // Overlap occurs if: start1 < end2 AND start2 < end1
    return start1 < end2 && start2 < end1;
}

/**
 * Convert time string (e.g., "10:00" or "2:30 PM") to minutes since midnight
 * @param {string} timeStr
 * @returns {number} - Minutes since midnight
 */
function timeToMinutes(timeStr) {
    // Handle both 24-hour and 12-hour formats
    const time = timeStr.trim();
    
    // Check if it's 12-hour format with AM/PM
    const isPM = time.includes('PM') || time.includes('pm');
    const isAM = time.includes('AM') || time.includes('am');
    
    // Extract hours and minutes
    const cleanTime = time.replace(/[APMapm\s]/g, '');
    const [hoursStr, minutesStr] = cleanTime.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr || '0', 10);
    
    // Convert to 24-hour format if needed
    if (isPM && hours !== 12) {
        hours += 12;
    } else if (isAM && hours === 12) {
        hours = 0;
    }
    
    return hours * 60 + minutes;
}

/**
 * Detect conflicts among a set of events/sessions
 * Only checks for conflicts between sessions that could actually conflict:
 * - Different courses (same course sessions can't conflict)
 * - Same week and day
 * - Overlapping times (not just back-to-back)
 * @param {Array} events - Array of calendar events with session data
 * @returns {Set} - Set of event IDs that have conflicts
 */
export function detectConflicts(events) {
    const conflicts = new Set();
    
    // Filter to only check enrolled and selected events (not alternatives)
    const relevantEvents = events.filter(event => {
        const state = event.extendedProps.eventState;
        return state === 'enrolled' || state === 'selected' || state === 'lecture';
    });
    
    // Compare each event with every other event
    for (let i = 0; i < relevantEvents.length; i++) {
        for (let j = i + 1; j < relevantEvents.length; j++) {
            const event1 = relevantEvents[i];
            const event2 = relevantEvents[j];
            
            // Skip if same event
            if (event1.id === event2.id) continue;
            
            // Skip if same course (can't conflict with yourself)
            if (event1.extendedProps.courseId === event2.extendedProps.courseId) continue;
            
            // Extract session data from extendedProps
            const session1 = {
                DayOfWeek: event1.extendedProps.dayOfWeek,
                StartTime: event1.extendedProps.startTime,
                EndTime: event1.extendedProps.endTime,
                Week: event1.extendedProps.weekNumber
            };
            
            const session2 = {
                DayOfWeek: event2.extendedProps.dayOfWeek,
                StartTime: event2.extendedProps.startTime,
                EndTime: event2.extendedProps.endTime,
                Week: event2.extendedProps.weekNumber
            };
            
            // Check if they conflict
            if (session1.Week === session2.Week && sessionsConflict(session1, session2)) {
                conflicts.add(event1.id);
                conflicts.add(event2.id);
            }
        }
    }
    
    return conflicts;
}

/**
 * Check if a specific session conflicts with any in a list
 * @param {Object} session - Session to check
 * @param {Array} otherSessions - Array of other sessions
 * @returns {boolean} - True if there's a conflict
 */
export function hasConflict(session, otherSessions) {
    return otherSessions.some(other => sessionsConflict(session, other));
}
