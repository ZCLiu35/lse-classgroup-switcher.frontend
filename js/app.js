// ======================================
// Main Application - ClassSwitcher
// ======================================

import { CONFIG } from './config.js';
import * as utils from './utils.js';

class ClassSwitcherApp {
    constructor() {
        // Application state
        this.currentTerm = 'AT';
        this.currentWeek = 1;
        this.calendar = null;
        
        // Data storage
        this.courses = [];
        this.groups = [];
        this.sessions = {}; // Now an object: { GroupID: { Term: [sessions] } }
        this.enrollment = [];
        
        // Course color mapping
        this.courseColors = new Map();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Load all data
            await this.loadData();
            
            // Assign colors to courses
            this.assignCourseColors();
            
            // Detect current week and term
            this.detectCurrentWeekAndTerm();
            
            // Initialize calendar
            this.initializeCalendar();
            
            // Render sidebar
            this.renderSidebar();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial week
            this.loadWeek(this.currentTerm, this.currentWeek);
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load application. Please refresh the page.');
        }
    }

    /**
     * Load all JSON data files
     */
    async loadData() {
        try {
            [this.courses, this.groups, this.sessions, this.enrollment] = await Promise.all([
                utils.loadJSON(CONFIG.DATA_PATHS.courses),
                utils.loadJSON(CONFIG.DATA_PATHS.groups),
                utils.loadJSON(CONFIG.DATA_PATHS.sessions),
                utils.loadJSON(CONFIG.DATA_PATHS.enrollment)
            ]);
            
            console.log('Data loaded successfully:', {
                courses: this.courses.length,
                groups: this.groups.length,
                sessions: Object.keys(this.sessions).length,
                enrollment: this.enrollment.length
            });
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    /**
     * Assign colors to each course
     */
    assignCourseColors() {
        this.courses.forEach((course, index) => {
            const colorClass = CONFIG.COURSE_COLORS[index % CONFIG.COURSE_COLORS.length];
            this.courseColors.set(course.CourseID, colorClass);
        });
    }

    /**
     * Detect current week and term based on today's date
     */
    detectCurrentWeekAndTerm() {
        const today = new Date();
        const term = utils.getTermForDate(today);
        
        if (term) {
            this.currentTerm = term;
            this.currentWeek = utils.getWeekNumberForDate(today, term);
        } else {
            // Default to AT Week 1 if not in any term
            this.currentTerm = 'AT';
            this.currentWeek = 1;
        }
        
        console.log(`Detected current term: ${this.currentTerm}, Week ${this.currentWeek}`);
    }

    /**
     * Initialize FullCalendar
     */
    initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: false, // We use custom navigation
            allDaySlot: CONFIG.CALENDAR.allDaySlot,
            slotMinTime: CONFIG.CALENDAR.minTime,
            slotMaxTime: CONFIG.CALENDAR.maxTime,
            slotDuration: CONFIG.CALENDAR.slotDuration,
            slotLabelInterval: CONFIG.CALENDAR.slotLabelInterval,
            nowIndicator: CONFIG.CALENDAR.nowIndicator,
            weekends: CONFIG.CALENDAR.weekends,
            height: CONFIG.CALENDAR.height,
            expandRows: CONFIG.CALENDAR.expandRows,
            firstDay: CONFIG.CALENDAR.weekStart,
            
            // Event handlers
            eventClick: this.handleEventClick.bind(this),
            eventMouseEnter: this.handleEventHover.bind(this),
            
            // Custom event content
            eventContent: this.renderEventContent.bind(this)
        });
        
        this.calendar.render();
    }

    /**
     * Render custom event content
     */
    renderEventContent(arg) {
        const { courseCode, groupType, groupNumber, location } = arg.event.extendedProps;
        const groupDisplay = groupType === 'LEC' ? 'LEC' : `Tut-G${groupNumber}`;
        
        return {
            html: `
                <div class="event-content">
                    <div class="event-course">${courseCode}</div>
                    <div class="event-type">${groupDisplay}</div>
                    <div class="event-location">${location}</div>
                </div>
            `
        };
    }

    /**
     * Handle event click
     */
    handleEventClick(info) {
        const props = info.event.extendedProps;
        alert(`${props.courseName}\n${props.groupType} Group ${props.groupNumber}\n\nInstructor: ${props.instructor}\nLocation: ${props.location}\nWeek ${props.weekNumber}`);
    }

    /**
     * Handle event hover (for tooltip - basic implementation)
     */
    handleEventHover(info) {
        const props = info.event.extendedProps;
        info.el.title = `${props.courseName}\n${props.groupType} Group ${props.groupNumber}\nInstructor: ${props.instructor}`;
    }

    /**
     * Render sidebar with enrolled courses
     */
    renderSidebar() {
        const container = document.getElementById('enrolledCoursesList');
        container.innerHTML = '';
        
        // Get enrolled courses for current term
        const enrolledCourses = this.getEnrolledCoursesForTerm(this.currentTerm);
        
        enrolledCourses.forEach(course => {
            const enrollment = this.enrollment.find(e => e.CourseID === course.CourseID);
            if (!enrollment) return;
            
            const colorClass = this.courseColors.get(course.CourseID);
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            
            // Build enrolled groups display
            let groupsHTML = '';
            Object.entries(enrollment.EnrolledGroups).forEach(([type, groupId]) => {
                const group = this.groups.find(g => g.GroupID === groupId);
                if (group) {
                    const typeLabel = type === 'LEC' ? 'Lecture' : 
                                     type === 'CLA' ? 'Class' : 
                                     type === 'SEM' ? 'Seminar' : type;
                    groupsHTML += `<div class="course-card-detail">${typeLabel}: Group ${group.GroupNumber}</div>`;
                }
            });
            
            courseCard.innerHTML = `
                <div class="course-card-header">
                    <div class="course-color-dot ${colorClass}"></div>
                    <div class="course-card-title">${course.CourseCode}</div>
                </div>
                ${groupsHTML}
            `;
            
            container.appendChild(courseCard);
        });
    }

    /**
     * Get enrolled courses for a specific term
     */
    getEnrolledCoursesForTerm(termCode) {
        return this.courses.filter(course => {
            return course.Terms.includes(termCode);
        });
    }

    /**
     * Load week data and update calendar
     */
    loadWeek(termCode, weekNumber) {
        this.currentTerm = termCode;
        this.currentWeek = weekNumber;
        
        // Get date range for this week
        const { start, end } = utils.getWeekDateRange(termCode, weekNumber);
        
        // Update calendar date
        this.calendar.gotoDate(start);
        
        // Get events for this week
        const events = this.getEventsForWeek(termCode, weekNumber, start);
        
        // Update calendar events
        this.calendar.removeAllEvents();
        this.calendar.addEventSource(events);
        
        // Update UI
        this.updateNavigationUI(start, end);
    }

    /**
     * Get all enrolled events for a specific week
     * Uses nested sessions structure: { GroupID: { Term: [sessions] } }
     * This provides O(1) lookup instead of filtering through all sessions.
     */
    getEventsForWeek(termCode, weekNumber, weekStart) {
        const events = [];
        const enrolledCourses = this.getEnrolledCoursesForTerm(termCode);
        
        enrolledCourses.forEach(course => {
            const enrollment = this.enrollment.find(e => e.CourseID === course.CourseID);
            if (!enrollment) return;
            
            // Process all enrolled groups for this course
            Object.entries(enrollment.EnrolledGroups).forEach(([groupType, groupId]) => {
                const group = this.groups.find(g => g.GroupID === groupId);
                if (!group) return;
                
                // Get sessions for this group and term (direct lookup, no filtering!)
                const groupSessions = this.sessions[groupId]?.[termCode];
                if (!groupSessions) return;
                
                // Filter sessions for this specific week
                const weekSessions = groupSessions.filter(s => s.Week === weekNumber);
                
                // Convert each session to a calendar event
                weekSessions.forEach(session => {
                    const event = utils.sessionToEvent(
                        session, 
                        course, 
                        group, 
                        weekStart, 
                        this.courseColors.get(course.CourseID),
                        true
                    );
                    events.push(event);
                });
            });
        });
        
        return events;
    }

    /**
     * Update navigation UI elements
     */
    updateNavigationUI(start, end) {
        // Update week display
        document.getElementById('weekDisplay').textContent = `Week ${this.currentWeek}`;
        
        // Update date range
        document.getElementById('dateRange').textContent = utils.formatDateRange(start, end);
        
        // Update term selector
        document.getElementById('termSelector').value = this.currentTerm;
        
        // Disable/enable navigation buttons
        const term = CONFIG.TERMS[this.currentTerm];
        document.getElementById('prevWeek').disabled = this.currentWeek <= 1;
        document.getElementById('nextWeek').disabled = this.currentWeek >= term.totalWeeks;
    }

    /**
     * Set up event listeners for navigation
     */
    setupEventListeners() {
        // Term selector
        document.getElementById('termSelector').addEventListener('change', (e) => {
            this.loadWeek(e.target.value, 1);
        });
        
        // Week navigation
        document.getElementById('prevWeek').addEventListener('click', () => {
            if (this.currentWeek > 1) {
                this.loadWeek(this.currentTerm, this.currentWeek - 1);
            }
        });
        
        document.getElementById('nextWeek').addEventListener('click', () => {
            const term = CONFIG.TERMS[this.currentTerm];
            if (this.currentWeek < term.totalWeeks) {
                this.loadWeek(this.currentTerm, this.currentWeek + 1);
            }
        });
        
        // Today button
        document.getElementById('todayBtn').addEventListener('click', () => {
            this.detectCurrentWeekAndTerm();
            this.loadWeek(this.currentTerm, this.currentWeek);
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        const calendarEl = document.getElementById('calendar');
        calendarEl.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new ClassSwitcherApp();
    app.init();
});
