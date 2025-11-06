// ======================================
// Configuration Constants
// ======================================

export const CONFIG = {
    // Term Configuration
    TERMS: {
        AT: {
            name: 'Autumn Term',
            code: 'AT',
            weekOneStart: '2025-09-29', // Monday, Sep 29, 2025
            totalWeeks: 11
        },
        WT: {
            name: 'Winter Term',
            code: 'WT',
            weekOneStart: '2026-01-19', // Monday, Jan 19, 2026
            totalWeeks: 11
        },
        ST: {
            name: 'Spring Term',
            code: 'ST',
            weekOneStart: '2026-05-05', // Monday, May 5, 2026
            totalWeeks: 11
        }
    },

    // Calendar Configuration
    CALENDAR: {
        weekStart: 1, // Monday
        minTime: '09:00:00',
        maxTime: '20:00:00',
        slotDuration: '00:30:00',
        slotLabelInterval: '01:00:00',
        allDaySlot: false,
        nowIndicator: true,
        weekends: false, // Hide weekends for academic schedule
        headerToolbar: false, // We'll use custom navigation
        height: '100%',
        expandRows: true // Auto-expand rows to fill available height
    },

    // Data File Paths
    DATA_PATHS: {
        courses: 'data/courses.json',
        sessions: 'data/sessions.json',
        enrollment: 'data/enrollment.json'
    },

    // Session Types
    SESSION_TYPES: {
        LECTURE: 'Lecture',
        TUTORIAL: 'Tutorial',
        SEMINAR: 'Seminar'
    }
};

// Day of week mapping
export const DAYS = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday'
};

// Export for use in other modules
export default CONFIG;
