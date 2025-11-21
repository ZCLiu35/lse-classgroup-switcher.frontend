// ======================================
// Main Application - ClassSwitcher
// ======================================

import { CONFIG } from './config.js';
import * as utils from './utils.js';
import { PlanningState } from './planningState.js';
import { StorageManager } from './storage.js';
import { SidebarManager } from './sidebarManager.js';

class ClassSwitcherApp {
    constructor() {
        // Application state
        this.currentTerm = 'AT';
        this.currentWeek = 1;
        this.calendar = null;
        
        // Data storage
        this.courses = [];
        this.sessions = {};
        this.enrollment = [];
        
        // Course color mapping
        this.courseColors = new Map();
        
        // Planning mode state
        this.planningState = new PlanningState(this);
        
        // Modal elements
        this.modal = null;
        this.modalElements = {};
        
        // Storage manager
        this.storage = new StorageManager();
        
        // Sidebar manager
        this.sidebarManager = new SidebarManager(this);
        
        // Debounced save function to avoid excessive localStorage writes
        this._debouncedSavePlanningState = utils.debounce(() => {
            this.storage.savePlanningState(this.planningState.getPreferences());
            console.log('Planning preferences saved to localStorage:', {
                visibleCourses: Array.from(this.planningState.visibleCourses),
                showAlternatives: Object.fromEntries(this.planningState.showAlternatives)
            });
        }, 300);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Load all data
            await this.loadData();
            
            // Apply enrollment overrides from localStorage
            this.applyEnrollmentOverrides();
            
            // Assign and load colors
            this.loadOrAssignCourseColors();
            
            // Detect current week and term
            this.detectCurrentWeekAndTerm();
            
            // Initialize calendar
            this.initializeCalendar();
            
            // Initialize modal
            this.initializeModal();
            
            // Load saved mode and planning state
            this.restoreAppState();
            
            // Render appropriate sidebar based on mode
            if (this.planningState.isPlanning()) {
                // Planning sidebar already rendered in restoreAppState()
            } else {
                this.sidebarManager.renderViewingSidebar();
            }
            
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
            [this.courses, this.sessions, this.enrollment] = await Promise.all([
                utils.loadJSON(CONFIG.DATA_PATHS.courses),
                utils.loadJSON(CONFIG.DATA_PATHS.sessions),
                utils.loadJSON(CONFIG.DATA_PATHS.enrollment)
            ]);
            
            console.log('Data loaded successfully:', {
                courses: this.courses.length,
                sessions: Object.keys(this.sessions).length
            });
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    /**
     * Apply enrollment overrides from localStorage
     */
    applyEnrollmentOverrides() {
        const overrides = this.storage.loadEnrollmentOverrides();
        
        if (Object.keys(overrides).length === 0) {
            console.log('No enrollment overrides found in localStorage');
            return;
        }
        
        console.log('Applying enrollment overrides:', overrides);
        
        // Apply each override
        Object.entries(overrides).forEach(([courseId, groupChanges]) => {
            const enrollmentEntry = this.enrollment[courseId];
            if (!enrollmentEntry) {
                console.warn(`Course ${courseId} not found in enrollment`);
                return;
            }
            
            // Apply each group type change (now storing group numbers)
            Object.entries(groupChanges).forEach(([groupType, newGroupNumber]) => {
                if (enrollmentEntry[groupType] !== undefined) {
                    const oldGroupNumber = enrollmentEntry[groupType];
                    console.log(`Override: ${courseId} ${groupType}: ${oldGroupNumber} → ${newGroupNumber}`);
                    enrollmentEntry[groupType] = newGroupNumber;
                }
            });
        });
    }

    /**
     * Load saved colors or assign new ones and inject CSS styles
     */
    loadOrAssignCourseColors() {
        // Try to load saved colors first
        const savedColors = this.storage.loadCourseColors();
        
        if (savedColors && savedColors.size > 0) {
            console.log('Loaded saved course colors from localStorage');
            this.courseColors = savedColors;
        } else {
            console.log('Generating new course colors');
            // Assign colors to each course
            const total = this.courses.length;
            this.courses.forEach((course, index) => {
                const color = utils.generateCourseColor(index, total);
                const borderColor = utils.generateBorderColor(color);
                
                // Store both background and border colors
                this.courseColors.set(course.CourseCode, {
                    background: color,
                    border: borderColor,
                    index: index
                });
            });
            
            // Save the newly generated colors
            this.storage.saveCourseColors(this.courseColors);
        }
        
        // Inject dynamic CSS styles
        // Remove existing dynamic styles if any
        const existingStyle = document.getElementById('dynamic-course-colors');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Create new style element
        const styleEl = document.createElement('style');
        styleEl.id = 'dynamic-course-colors';
        
        let css = '';
        this.courseColors.forEach((colorData) => {
            const className = `course-color-${colorData.index}`;
            css += `
        .${className} {
            background-color: ${colorData.background};
            border-color: ${colorData.border};
            color: white;
        }
        `;
        });
        
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
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
     * Restore app state from localStorage
     */
    restoreAppState() {
        const savedMode = this.storage.loadMode();
        
        if (savedMode === 'planning') {
            const savedPlanningState = this.storage.loadPlanningState();
            
            if (savedPlanningState) {
                console.log('Restoring planning mode state');
                
                // Enter planning mode first
                const enrolledCourses = this.getEnrolledCoursesForTerm(this.currentTerm);
                this.planningState.enterPlanningMode(enrolledCourses);
                
                // Restore only visibility and toggle preferences (NOT staged changes)
                this.planningState.restorePreferences(savedPlanningState);
                
                // Update UI
                this.updatePlanningModeUI();
                this.sidebarManager.renderPlanningSidebar();
                
                console.log('Planning preferences restored:', {
                    visibleCourses: this.planningState.visibleCourses.size
                });
            } else {
                // Planning mode was saved but no state - enter fresh
                this.enterPlanningMode();
            }
        }
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
            
            // Enable side-by-side display for overlapping events
            slotEventOverlap: false,  // Force events to display side-by-side without overlap
            eventOverlap: true,       // Events can still be scheduled at the same time
            
            // Event handlers
            eventClick: this.handleEventClick.bind(this),
            
            // Custom event content
            eventContent: this.renderEventContent.bind(this)
        });
        
        this.calendar.render();
    }

    /**
     * Initialize modal for event details
     */
    initializeModal() {
        this.modal = document.getElementById('eventModal');
        this.modalElements = {
            courseName: document.getElementById('modalCourseName'),
            courseCode: document.getElementById('modalCourseCode'),
            groupInfo: document.getElementById('modalGroupInfo'),
            time: document.getElementById('modalTime'),
            instructor: document.getElementById('modalInstructor'),
            location: document.getElementById('modalLocation'),
            closeBtn: document.getElementById('modalCloseBtn')
        };
        
        // Close modal when clicking close button
        this.modalElements.closeBtn.addEventListener('click', () => {
            this.hideModal();
        });
        
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.modal.classList.contains('hidden') && 
                !this.modal.contains(e.target) && 
                !e.target.closest('.fc-event')) {
                this.hideModal();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.hideModal();
            }
        });
    }

    /**
     * Render custom event content
     */
    renderEventContent(arg) {
        const { courseCode, groupType, groupNumber, location } = arg.event.extendedProps;
        const groupDisplay = `${groupType} Group ${groupNumber}`;
        
        return {
            html: `
                <div class="event-content">
                    <div class="event-course">${courseCode}</div>
                    <div class="event-type-location">${groupDisplay} • ${location}</div>
                </div>
            `
        };
    }

    /**
     * Handle event click
     */
    handleEventClick(info) {
        if (this.planningState.isPlanning()) {
            this.planningState.handleEventClick(
                info,
                (props, clickInfo) => this.showEventDetails(props, clickInfo),
                () => this.reloadPlanningView()
            );
        } else {
            const props = info.event.extendedProps;
            this.showEventDetails(props, info);
        }
    }

    /**
     * Reload planning view (calendar and sidebar)
     */
    reloadPlanningView() {
        this._debouncedSavePlanningState();
        this.sidebarManager.renderPlanningSidebar();
        this.loadWeek(this.currentTerm, this.currentWeek);
    }

    /**
     * Load week data and update calendar
     */
    loadWeek(termCode, weekNumber, forceSidebarUpdate = false) {
        const termChanged = this.currentTerm !== termCode;
        this.currentTerm = termCode;
        this.currentWeek = weekNumber;
        
        // Get date range for this week
        const { start, end } = utils.getWeekDateRange(termCode, weekNumber);
        
        // Update calendar date
        this.calendar.gotoDate(start);
        
        // Get events for this week based on mode
        let events;
        if (this.planningState.isPlanning()) {
            events = this.planningState.getEventsForPlanningMode(termCode, weekNumber, start);
        } else {
            events = this.getEventsForWeek(termCode, weekNumber, start);
        }
        
        // Update calendar events - full rerender
        this.calendar.removeAllEvents();
        this.calendar.addEventSource(events);
        
        // Update UI
        this.updateNavigationUI(start, end);
        
        // Update sidebar if term changed or forceSidebarUpdate is true
        if (termChanged || forceSidebarUpdate) {
            if (this.planningState.isPlanning()) {
                this.sidebarManager.renderPlanningSidebar();
            } else {
                this.sidebarManager.renderViewingSidebar();
            }
        }
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
     * Get all enrolled events for a specific week
     * Uses nested sessions structure: { CourseCode: { Type: { Number: { Term: [sessions] } } } }
     * This provides O(1) lookup instead of filtering through all sessions.
     */
    getEventsForWeek(termCode, weekNumber, weekStart) {
        const events = [];
        const enrolledCourses = this.getEnrolledCoursesForTerm(termCode);
        
        enrolledCourses.forEach(course => {
            const enrollment = this.enrollment[course.CourseCode];
            if (!enrollment) return;
            
            // Process all enrolled groups for this course
            Object.entries(enrollment).forEach(([groupType, groupNumber]) => {
                // Get sessions for this group and term (direct lookup!)
                const groupSessions = this.sessions[course.CourseCode]?.[groupType]?.[groupNumber]?.[termCode];
                if (!groupSessions) return;
                
                // Filter sessions for this specific week
                const weekSessions = groupSessions.filter(s => s.Week === weekNumber);
                
                // Convert each session to a calendar event
                weekSessions.forEach(session => {
                    // Determine event state based on group type
                    const eventState = groupType === 'LEC' ? 'lecture' : 'enrolled';
                    
                    const colorData = this.courseColors.get(course.CourseCode);
                    const colorClass = `course-color-${colorData.index}`;
                    
                    // Create group object for sessionToEvent
                    const group = {
                        CourseCode: course.CourseCode,
                        CourseName: course.CourseName,
                        Type: groupType,
                        GroupNumber: groupNumber
                    };
                    
                    const event = utils.sessionToEvent(
                        session, 
                        course, 
                        group, 
                        weekStart, 
                        colorClass,
                        eventState
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
            // Use forceSidebarUpdate=true to ensure sidebar updates even if term hasn't changed
            this.loadWeek(this.currentTerm, this.currentWeek, true);
        });
        
        // Planning mode toggle
        document.getElementById('planningModeToggle').addEventListener('click', () => {
            this.togglePlanningMode();
        });
        
        // Planning mode action buttons
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.exitPlanningMode('cancel');
        });
        
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.exitPlanningMode('save');
        });
        
        document.getElementById('applyBtn').addEventListener('click', () => {
            this.applyChanges();
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        const calendarEl = document.getElementById('calendar');
        calendarEl.innerHTML = `<div class="error-message">${message}</div>`;
    }
    
    // ======================================
    // Planning Mode Methods
    // ======================================
    
    /**
     * Toggle planning mode on/off
     */
    togglePlanningMode() {
        if (this.planningState.isPlanning()) {
            this.exitPlanningMode('cancel');
        } else {
            this.enterPlanningMode();
        }
    }
    
    /**
     * Enter planning mode
     */
    enterPlanningMode() {
        const enrolledCourses = this.getEnrolledCoursesForTerm(this.currentTerm);
        this.planningState.enterPlanningMode(enrolledCourses);
        
        // Try to restore previous planning preferences from localStorage
        const savedPlanningState = this.storage.loadPlanningState();
        if (savedPlanningState) {
            this.planningState.restorePreferences(savedPlanningState);
            console.log('Restored planning preferences from localStorage');
        }
        
        // Save mode to localStorage (but don't save planning state yet - no changes made)
        this.storage.saveMode('planning');
        
        // Update UI
        this.updatePlanningModeUI();
        this.sidebarManager.renderPlanningSidebar();
        
        // Reload calendar with alternatives
        this.loadWeek(this.currentTerm, this.currentWeek);
    }
    
    /**
     * Exit planning mode
     * @param {string} action - 'cancel', 'save', or 'apply'
     */
    exitPlanningMode(action) {
        // Save preferences (visibility & toggles) to localStorage BEFORE exiting
        // This preserves user preferences for next time they enter planning mode
        this.storage.savePlanningState(this.planningState.getPreferences());
        console.log('Planning preferences saved to localStorage');
        
        const changes = this.planningState.exitPlanningMode(action);
        
        if ((action === 'save' || action === 'apply') && changes && changes.size > 0) {
            // Apply changes to enrollment and save to localStorage
            this.applyChangesToEnrollment(changes);
            console.log('Changes applied:', changes);
        }
        
        // Save mode to localStorage
        this.storage.saveMode('viewing');
        
        // Update UI
        this.updatePlanningModeUI();
        this.sidebarManager.renderViewingSidebar();
        
        // Reload calendar in viewing mode
        this.loadWeek(this.currentTerm, this.currentWeek);
    }
    
    /**
     * Apply staged changes (in a real app, this would call backend API)
     */
    applyChanges() {
        const result = this.planningState.applyChanges((changes) => {
            this.applyChangesToEnrollment(changes);
        });
        
        if (!result.success) {
            if (result.message !== 'Application cancelled') {
                alert(result.message);
            }
            return;
        }
        
        // Save state and reload
        this._debouncedSavePlanningState();
        this.sidebarManager.renderPlanningSidebar();
        this.loadWeek(this.currentTerm, this.currentWeek);
        
        alert(result.message);
    }
    
    /**
     * Apply changes to enrollment data and save to localStorage
     * @param {Map} changes - Map of changes from planning state
     */
    applyChangesToEnrollment(changes) {
        const overrides = this.storage.loadEnrollmentOverrides();
        
        // Process each change
        changes.forEach((change, key) => {
            const { courseId, groupType, to } = change;
            
            // Update enrollment in memory (now storing group numbers)
            const enrollmentEntry = this.enrollment[courseId];
            if (enrollmentEntry) {
                enrollmentEntry[groupType] = to;
            }
            
            // Update overrides object (store group numbers)
            if (!overrides[courseId]) {
                overrides[courseId] = {};
            }
            overrides[courseId][groupType] = to;
        });
        
        // Save overrides to localStorage
        this.storage.saveEnrollmentOverrides(overrides);
        console.log('Enrollment overrides saved:', overrides);
    }
    
    /**
     * Update UI elements for planning mode
     */
    updatePlanningModeUI() {
        const header = document.querySelector('header');
        const toggleBtn = document.getElementById('planningModeToggle');
        const planningActions = document.getElementById('planningActions');
        
        if (this.planningState.isPlanning()) {
            // Planning mode ON
            header.classList.add('planning-mode-header');
            toggleBtn.classList.remove('bg-gray-200', 'text-gray-700');
            toggleBtn.classList.add('bg-amber-500', 'text-white');
            toggleBtn.textContent = '🔧 Planning Mode';
            planningActions.classList.remove('hidden');
            this.sidebarManager.updateSidebarVisibility(true);
        } else {
            // Viewing mode ON
            header.classList.remove('planning-mode-header');
            toggleBtn.classList.remove('bg-amber-500', 'text-white');
            toggleBtn.classList.add('bg-gray-200', 'text-gray-700');
            toggleBtn.textContent = 'Planning Mode';
            planningActions.classList.add('hidden');
            this.sidebarManager.updateSidebarVisibility(false);
        }
    }
    
    /**
     * Show event details in modal
     */
    showEventDetails(props, clickEvent = null) {
        // Format time
        const startTime = utils.getTimeString(clickEvent.event.start);
        const endTime = utils.getTimeString(clickEvent.event.end);
        const timeDisplay = `${startTime} - ${endTime}`;
        
        // Populate modal
        this.modalElements.courseName.textContent = props.courseName;
        this.modalElements.courseCode.textContent = props.courseCode;
        this.modalElements.groupInfo.textContent = `${props.groupType} Group ${props.groupNumber}`;
        this.modalElements.time.textContent = timeDisplay;
        this.modalElements.instructor.textContent = props.instructor || 'TBA';
        this.modalElements.location.textContent = props.location;
        
        // Position modal near the clicked event
        if (clickEvent && clickEvent.jsEvent) {
            const event = clickEvent.jsEvent;
            const clickX = event.clientX;
            const clickY = event.clientY;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const modalWidth = 400; // max-width from CSS
            const modalHeight = 300; // approximate height
            
            let left = clickX + 15; // 15px offset from cursor
            let top = clickY;
            
            // Adjust if modal would go off right edge
            if (left + modalWidth > windowWidth) {
                left = clickX - modalWidth - 15;
            }
            
            // Adjust if modal would go off bottom edge
            if (top + modalHeight > windowHeight) {
                top = windowHeight - modalHeight - 20;
            }
            
            // Ensure modal doesn't go off top or left edges
            left = Math.max(10, left);
            top = Math.max(10, top);
            
            this.modal.style.left = `${left}px`;
            this.modal.style.top = `${top}px`;
            this.modal.style.transform = 'none';
        } else {
            // Fallback to center if no click event
            this.modal.style.top = '50%';
            this.modal.style.left = '50%';
            this.modal.style.transform = 'translate(-50%, -50%)';
        }
        
        // Show modal with fade-in animation
        this.modal.classList.remove('hidden', 'fade-out');
        this.modal.classList.add('fade-in');
    }
    
    /**
     * Hide the event details modal
     */
    hideModal() {
        // Start fade-out animation
        this.modal.classList.remove('fade-in');
        this.modal.classList.add('fade-out');
        
        // Hide modal after animation completes (200ms)
        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.modal.classList.remove('fade-out');
        }, 200);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new ClassSwitcherApp();
    app.init();
});
