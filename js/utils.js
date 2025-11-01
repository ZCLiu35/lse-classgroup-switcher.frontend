// ======================================
// Utility Functions
// ======================================

import { CONFIG } from './config.js';

/**
 * Convert week number to date range
 * @param {string} termCode - Term code (AT, WT, ST)
 * @param {number} weekNumber - Week number (1-11)
 * @returns {Object} { start: Date, end: Date }
 */
export function getWeekDateRange(termCode, weekNumber) {
    const term = CONFIG.TERMS[termCode];
    if (!term) {
        throw new Error(`Invalid term code: ${termCode}`);
    }

    const weekOneStart = new Date(term.weekOneStart);
    const daysToAdd = (weekNumber - 1) * 7;
    
    const weekStart = new Date(weekOneStart);
    weekStart.setDate(weekStart.getDate() + daysToAdd);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Friday (5 days from Monday)
    
    return {
        start: weekStart,
        end: weekEnd
    };
}

/**
 * Format date range for display
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {string} Formatted date range (e.g., "Sep 29 - Oct 5, 2025")
 */
export function formatDateRange(start, end) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const startMonth = months[start.getMonth()];
    const endMonth = months[end.getMonth()];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = start.getFullYear();
    
    if (start.getMonth() === end.getMonth()) {
        return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
}

/**
 * Get current week number for a given date and term
 * @param {Date} date - Date to check
 * @param {string} termCode - Term code
 * @returns {number|null} Week number or null if not in term
 */
export function getWeekNumberForDate(date, termCode) {
    const term = CONFIG.TERMS[termCode];
    if (!term) return null;
    
    const weekOneStart = new Date(term.weekOneStart);
    const daysDiff = Math.floor((date - weekOneStart) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysDiff / 7) + 1;
    
    if (weekNumber >= 1 && weekNumber <= term.totalWeeks) {
        return weekNumber;
    }
    return null;
}

/**
 * Find which term a date falls into
 * @param {Date} date - Date to check
 * @returns {string|null} Term code or null if not in any term
 */
export function getTermForDate(date) {
    for (const [code, term] of Object.entries(CONFIG.TERMS)) {
        const weekNumber = getWeekNumberForDate(date, code);
        if (weekNumber !== null) {
            return code;
        }
    }
    return null;
}

/**
 * Convert session to FullCalendar event format
 * @param {Object} session - Session object from sessions.json (Week, Day, StartTime, EndTime, Room)
 * @param {Object} course - Course object from courses.json
 * @param {Object} group - Group object from groups.json
 * @param {Date} weekStart - Start date of the week
 * @param {string} courseColor - CSS class for course color
 * @param {string} eventState - Event state: 'enrolled', 'selected', 'alternative', 'lecture'
 * @returns {Object} FullCalendar event object
 */
export function sessionToEvent(session, course, group, weekStart, courseColor, eventState = 'enrolled') {
    // Map day names to day numbers (0 = Monday)
    const dayMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
    
    // Calculate the date for this session
    const sessionDate = new Date(weekStart);
    sessionDate.setDate(sessionDate.getDate() + dayMap[session.Day]);
    
    // Parse time (format: "HH:MM" in 24-hour format)
    const [hours, minutes] = session.StartTime.split(':').map(Number);
    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(hours, minutes, 0);
    
    // Calculate end time
    const [endHours, endMinutes] = session.EndTime.split(':').map(Number);
    const endDateTime = new Date(sessionDate);
    endDateTime.setHours(endHours, endMinutes, 0);
    
    // Build event classes based on state
    const eventClasses = [courseColor];
    if (group.Type === 'LEC') {
        eventClasses.push('lecture');
    } else {
        eventClasses.push(`event-${eventState}`);
    }
    
    const groupDisplay = group.Type === 'LEC' ? 'Lec' : `${group.Type}-G${group.GroupNumber}`;
    
    return {
        id: `${course.CourseID}-${group.GroupID}-${session.Week}`,
        title: `${course.CourseCode}\n${groupDisplay}\n${session.Room}`,
        start: startDateTime,
        end: endDateTime,
        classNames: eventClasses,
        extendedProps: {
            courseCode: course.CourseCode,
            courseName: course.CourseName,
            courseId: course.CourseID,
            groupId: group.GroupID,
            groupType: group.Type,
            groupNumber: group.GroupNumber,
            instructor: group.Teacher,
            location: session.Room,
            weekNumber: session.Week,
            dayOfWeek: session.Day,
            startTime: session.StartTime,
            endTime: session.EndTime,
            eventState: eventState
        }
    };
}

/**
 * Load JSON file
 * @param {string} path - Path to JSON file
 * @returns {Promise<Object>} Parsed JSON data
 */
export async function loadJSON(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${path}:`, error);
        throw error;
    }
}

/**
 * Debounce function for performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default {
    getWeekDateRange,
    formatDateRange,
    getWeekNumberForDate,
    getTermForDate,
    sessionToEvent,
    loadJSON,
    debounce
};
