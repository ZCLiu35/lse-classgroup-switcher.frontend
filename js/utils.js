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
 * @param {Object} session - Session object from sessions.json
 * @param {Object} course - Course object from courses.json
 * @param {Object} group - Group object from groups.json
 * @param {Date} weekStart - Start date of the week
 * @param {string} courseColor - CSS class for course color
 * @param {boolean} isEnrolled - Whether this is an enrolled session
 * @returns {Object} FullCalendar event object
 */
export function sessionToEvent(session, course, group, weekStart, courseColor, isEnrolled) {
    // Calculate the date for this session
    const sessionDate = new Date(weekStart);
    sessionDate.setDate(sessionDate.getDate() + (session.DayOfWeek - 1));
    
    // Parse time (format: "HH:MM AM/PM")
    const [time, period] = session.StartTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }
    
    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(hours, minutes, 0);
    
    // Calculate end time
    const [endTime, endPeriod] = session.EndTime.split(' ');
    let [endHours, endMinutes] = endTime.split(':').map(Number);
    
    if (endPeriod === 'PM' && endHours !== 12) {
        endHours += 12;
    } else if (endPeriod === 'AM' && endHours === 12) {
        endHours = 0;
    }
    
    const endDateTime = new Date(sessionDate);
    endDateTime.setHours(endHours, endMinutes, 0);
    
    // Build event object
    const eventType = group.Type === 'Lecture' ? 'lecture' : 'tutorial-enrolled';
    const groupDisplay = group.Type === 'Lecture' ? 'Lec' : `Tut-G${group.GroupNumber}`;
    
    return {
        id: `${session.CourseID}-${session.GroupID}-${session.WeekNumber}`,
        title: `${course.CourseCode}\n${groupDisplay}\n${session.Location}`,
        start: startDateTime,
        end: endDateTime,
        classNames: [courseColor, eventType],
        extendedProps: {
            courseCode: course.CourseCode,
            courseName: course.CourseName,
            groupType: group.Type,
            groupNumber: group.GroupNumber,
            instructor: group.Instructor,
            location: session.Location,
            weekNumber: session.WeekNumber,
            isEnrolled: isEnrolled
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
