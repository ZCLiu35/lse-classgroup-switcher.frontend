// ======================================
// Utility Functions
// ======================================

import { CONFIG } from './config.js';

/**
 * Generate a color for a course based on its index
 * Uses a predefined color palette that cycles for unlimited courses
 * @param {number} index - Course index
 * @param {number} total - Total number of courses
 * @returns {string} HSL color string
 */
export function generateCourseColor(index, total) {
    // Curated color palette with good contrast and visual distinction
    // Using specific hues that work well together (avoiding reds to prevent conflict with error indicators)
    const colorPalette = [
        { h: 210, s: 75, l: 45 },  // Blue
        { h: 270, s: 65, l: 48 },  // Purple
        { h: 30,  s: 75, l: 45 },  // Orange
        { h: 180, s: 60, l: 40 },  // Cyan/Teal
        { h: 300, s: 70, l: 45 },  // Magenta
        { h: 200, s: 70, l: 42 },  // Deep Blue
        { h: 250, s: 65, l: 45 },  // Indigo
        { h: 40,  s: 70, l: 45 },  // Amber
        { h: 190, s: 65, l: 42 },  // Dark Cyan
        { h: 280, s: 68, l: 46 },  // Violet
        { h: 220, s: 70, l: 44 },  // Royal Blue
        { h: 170, s: 60, l: 42 },  // Turquoise
    ];
    
    // Cycle through the palette for any number of courses
    const paletteIndex = index % colorPalette.length;
    const color = colorPalette[paletteIndex];
    
    // Add slight variation for courses beyond the first cycle
    const cycle = Math.floor(index / colorPalette.length);
    const lightnessAdjust = (cycle % 2) * 3; // Alternate between 0 and 3
    
    return `hsl(${color.h}, ${color.s}%, ${color.l + lightnessAdjust}%)`;
}

/**
 * Generate a darker border color from the main color
 * @param {string} hslColor - HSL color string
 * @returns {string} Darker HSL color string
 */
export function generateBorderColor(hslColor) {
    // Extract HSL values and darken
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
        const [, h, s, l] = match;
        const darkerL = Math.max(0, parseInt(l) - 12);
        return `hsl(${h}, ${s}%, ${darkerL}%)`;
    }
    return hslColor;
}

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
    
    return (weekNumber >= 1 && weekNumber <= term.totalWeeks) ? weekNumber : null;
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
 * Get day name from Date object
 * @param {Date} date - Date object
 * @returns {string} - Day name (Mon, Tue, Wed, etc.)
 */
export function getDayName(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
}

/**
 * Get time string from Date object in HH:MM format
 * @param {Date} date - Date object
 * @returns {string} - Time string in HH:MM format (24-hour)
 */
export function getTimeString(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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
    
    // Parse and set start time
    const [startHours, startMinutes] = session.StartTime.split(':').map(Number);
    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(startHours, startMinutes, 0);
    
    // Parse and set end time
    const [endHours, endMinutes] = session.EndTime.split(':').map(Number);
    const endDateTime = new Date(sessionDate);
    endDateTime.setHours(endHours, endMinutes, 0);
    
    // Build event classes based on state
    const eventClasses = [courseColor];
    eventClasses.push(group.Type === 'LEC' ? 'lecture' : `event-${eventState}`);
    
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
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
