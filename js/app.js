// ======================================
// Main Application - ClassSwitcher
// ======================================

import { CONFIG } from './config.js';
import * as utils from './utils.js';
import { PlanningState } from './planningState.js';
import { detectConflicts } from './conflictDetector.js';

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
        
        // Planning mode state
        this.planningState = new PlanningState();
        
        // Conflict tracking
        this.conflictingEventIds = new Set();
        
        // Modal elements
        this.modal = null;
        this.modalElements = {};
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
            
            // Initialize modal
            this.initializeModal();
            
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
            this.handlePlanningEventClick(info);
        } else {
            const props = info.event.extendedProps;
            this.showEventDetails(props, info);
        }
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
                <div class="course-card-name">${course.CourseName}</div>
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
        
        // Get events for this week based on mode
        let events;
        if (this.planningState.isPlanning()) {
            events = this.getEventsForPlanningMode(termCode, weekNumber, start);
        } else {
            events = this.getEventsForWeek(termCode, weekNumber, start);
        }
        
        // Detect conflicts in planning mode
        if (this.planningState.isPlanning()) {
            this.conflictingEventIds = detectConflicts(events);
            
            // Mark conflicting events
            events.forEach(event => {
                if (this.conflictingEventIds.has(event.id)) {
                    // Ensure classNames is an array before pushing
                    if (!Array.isArray(event.classNames)) {
                        event.classNames = [];
                    }
                    event.classNames.push('event-conflict');
                }
            });
        } else {
            this.conflictingEventIds.clear();
        }
        
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
                    // Determine event state based on group type
                    const eventState = group.Type === 'LEC' ? 'lecture' : 'enrolled';
                    
                    const event = utils.sessionToEvent(
                        session, 
                        course, 
                        group, 
                        weekStart, 
                        this.courseColors.get(course.CourseID),
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
            this.loadWeek(this.currentTerm, this.currentWeek);
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
        
        // Update UI
        this.updatePlanningModeUI();
        this.renderPlanningSidebar();
        
        // Reload calendar with alternatives
        this.loadWeek(this.currentTerm, this.currentWeek);
    }
    
    /**
     * Exit planning mode
     * @param {string} action - 'cancel', 'save', or 'apply'
     */
    exitPlanningMode(action) {
        const changes = this.planningState.exitPlanningMode(action);
        
        if (action === 'save' && changes && changes.size > 0) {
            // Store changes for later (could save to localStorage)
            console.log('Changes saved:', changes);
            alert(`${changes.size} change(s) saved for later.`);
        }
        
        // Update UI
        this.updatePlanningModeUI();
        this.renderSidebar();
        
        // Reload calendar in viewing mode
        this.loadWeek(this.currentTerm, this.currentWeek);
    }
    
    /**
     * Apply staged changes (in a real app, this would call backend API)
     */
    applyChanges() {
        // Check for conflicts first
        if (this.conflictingEventIds.size > 0) {
            const confirmApply = confirm(
                `You have ${this.conflictingEventIds.size / 2} scheduling conflict(s). ` +
                `Are you sure you want to apply these changes?`
            );
            if (!confirmApply) return;
        }
        
        const changes = this.planningState.stagedChanges;
        
        if (changes.size === 0) {
            alert('No changes to apply.');
            return;
        }
        
        // In a real application, this would make API calls to update enrollment
        console.log('Applying changes:', changes);
        
        // Simulate success
        alert(`Successfully applied ${changes.size} change(s)!\n\n(In production, this would update your enrollment in the school portal)`);
        
        // Exit planning mode
        this.exitPlanningMode('apply');
    }
    
    /**
     * Update UI elements for planning mode
     */
    updatePlanningModeUI() {
        const header = document.querySelector('header');
        const toggleBtn = document.getElementById('planningModeToggle');
        const planningActions = document.getElementById('planningActions');
        const viewingSidebar = document.getElementById('viewingSidebar');
        const planningSidebar = document.getElementById('planningSidebar');
        
        if (this.planningState.isPlanning()) {
            // Planning mode ON
            header.classList.add('planning-mode-header');
            toggleBtn.classList.remove('bg-gray-200', 'text-gray-700');
            toggleBtn.classList.add('bg-amber-500', 'text-white');
            toggleBtn.textContent = '🔧 Planning Mode';
            planningActions.classList.remove('hidden');
            viewingSidebar.classList.add('hidden');
            planningSidebar.classList.remove('hidden');
        } else {
            // Viewing mode ON
            header.classList.remove('planning-mode-header');
            toggleBtn.classList.remove('bg-amber-500', 'text-white');
            toggleBtn.classList.add('bg-gray-200', 'text-gray-700');
            toggleBtn.textContent = 'Planning Mode';
            planningActions.classList.add('hidden');
            viewingSidebar.classList.remove('hidden');
            planningSidebar.classList.add('hidden');
        }
    }
    
    /**
     * Render planning mode sidebar with course filters
     */
    renderPlanningSidebar() {
        const container = document.getElementById('courseFiltersList');
        container.innerHTML = '';
        
        const enrolledCourses = this.getEnrolledCoursesForTerm(this.currentTerm);
        
        enrolledCourses.forEach(course => {
            const enrollment = this.enrollment.find(e => e.CourseID === course.CourseID);
            if (!enrollment) return;
            
            const colorClass = this.courseColors.get(course.CourseID);
            const isVisible = this.planningState.visibleCourses.has(course.CourseID);
            const hasChanges = this.planningState.hasChanges(course.CourseID);
            const showMode = this.planningState.showAlternatives.get(course.CourseID) || 'my';
            
            // Get tutorial/seminar groups (not lectures)
            const tutorialTypes = Object.keys(enrollment.EnrolledGroups).filter(type => type !== 'LEC');
            
            const filterItem = document.createElement('div');
            filterItem.className = 'course-filter-item';
            
            // Build change indicator
            let changeText = '';
            if (hasChanges) {
                const changes = this.planningState.getChangesForCourse(course.CourseID);
                const changeDescriptions = changes.map(ch => {
                    const fromGroup = this.groups.find(g => g.GroupID === ch.from);
                    const toGroup = this.groups.find(g => g.GroupID === ch.to);
                    return `${ch.groupType}${fromGroup?.GroupNumber}→${toGroup?.GroupNumber}`;
                });
                changeText = ` (${changeDescriptions.join(', ')})`;
            }
            
            // Count available groups (tutorials/seminars only)
            const availableGroups = this.groups.filter(g => 
                g.CourseID === course.CourseID && g.Type !== 'LEC'
            );
            
            filterItem.innerHTML = `
                <div class="course-filter-header">
                    <input type="checkbox" 
                           class="course-filter-checkbox" 
                           data-course-id="${course.CourseID}"
                           ${isVisible ? 'checked' : ''}>
                    <div class="course-color-dot ${colorClass}"></div>
                    <div class="course-filter-title">${course.CourseCode}</div>
                    ${hasChanges ? `<div class="course-filter-change-indicator">${changeText}</div>` : ''}
                </div>
                <div class="course-filter-name">${course.CourseName}</div>
                <div class="course-filter-controls">
                    <button class="course-filter-toggle-btn ${showMode === 'all' ? 'show-all' : 'show-my'}" 
                            data-course-id="${course.CourseID}">
                        ${showMode === 'my' ? 'My Sessions' : 'All Sessions'}
                    </button>
                </div>
                <div class="course-filter-info">Available: ${availableGroups.length} groups</div>
            `;
            
            container.appendChild(filterItem);
            
            // Add event listeners
            const checkbox = filterItem.querySelector('.course-filter-checkbox');
            checkbox.addEventListener('change', (e) => {
                this.planningState.toggleCourseVisibility(course.CourseID);
                this.loadWeek(this.currentTerm, this.currentWeek);
            });
            
            const toggleBtn = filterItem.querySelector('.course-filter-toggle-btn');
            toggleBtn.addEventListener('click', (e) => {
                const courseId = e.target.dataset.courseId;
                const currentMode = this.planningState.showAlternatives.get(courseId) || 'my';
                const newMode = currentMode === 'my' ? 'all' : 'my';
                this.planningState.setAlternativeMode(courseId, newMode);
                this.renderPlanningSidebar(); // Re-render to update button text
                this.loadWeek(this.currentTerm, this.currentWeek);
            });
        });
    }
    
    /**
     * Get events for planning mode (includes alternatives)
     */
    getEventsForPlanningMode(termCode, weekNumber, weekStart) {
        const events = [];
        const enrolledCourses = this.getEnrolledCoursesForTerm(termCode);
        
        enrolledCourses.forEach(course => {
            // Skip if course is hidden
            if (!this.planningState.visibleCourses.has(course.CourseID)) {
                return;
            }
            
            const enrollment = this.enrollment.find(e => e.CourseID === course.CourseID);
            if (!enrollment) return;
            
            const showMode = this.planningState.showAlternatives.get(course.CourseID) || 'my';
            
            // Add all enrolled lectures (always show)
            Object.entries(enrollment.EnrolledGroups).forEach(([groupType, groupId]) => {
                if (groupType === 'LEC') {
                    const group = this.groups.find(g => g.GroupID === groupId);
                    if (!group) return;
                    
                    const groupSessions = this.sessions[groupId]?.[termCode];
                    if (!groupSessions) return;
                    
                    const weekSessions = groupSessions.filter(s => s.Week === weekNumber);
                    weekSessions.forEach(session => {
                        const event = utils.sessionToEvent(
                            session, course, group, weekStart,
                            this.courseColors.get(course.CourseID),
                            'lecture'
                        );
                        events.push(event);
                    });
                }
            });
            
            // Add tutorials/seminars based on mode
            const tutorialTypes = Object.keys(enrollment.EnrolledGroups).filter(t => t !== 'LEC');
            
            tutorialTypes.forEach(groupType => {
                const enrolledGroupId = enrollment.EnrolledGroups[groupType];
                const selectedGroupId = this.planningState.getSelectedGroup(
                    course.CourseID, groupType, enrolledGroupId
                );
                
                if (showMode === 'my') {
                    // Show only enrolled and selected
                    const groupsToShow = new Set([enrolledGroupId, selectedGroupId]);
                    
                    groupsToShow.forEach(groupId => {
                        const group = this.groups.find(g => g.GroupID === groupId);
                        if (!group) return;
                        
                        const groupSessions = this.sessions[groupId]?.[termCode];
                        if (!groupSessions) return;
                        
                        const weekSessions = groupSessions.filter(s => s.Week === weekNumber);
                        weekSessions.forEach(session => {
                            let eventState;
                            if (groupId === selectedGroupId && groupId !== enrolledGroupId) {
                                eventState = 'selected';
                            } else {
                                eventState = 'enrolled';
                            }
                            
                            const event = utils.sessionToEvent(
                                session, course, group, weekStart,
                                this.courseColors.get(course.CourseID),
                                eventState
                            );
                            events.push(event);
                        });
                    });
                } else {
                    // Show all available groups
                    const allGroups = this.groups.filter(g => 
                        g.CourseID === course.CourseID && g.Type === groupType
                    );
                    
                    allGroups.forEach(group => {
                        const groupSessions = this.sessions[group.GroupID]?.[termCode];
                        if (!groupSessions) return;
                        
                        const weekSessions = groupSessions.filter(s => s.Week === weekNumber);
                        weekSessions.forEach(session => {
                            let eventState;
                            if (group.GroupID === selectedGroupId && group.GroupID !== enrolledGroupId) {
                                eventState = 'selected';
                            } else if (group.GroupID === enrolledGroupId) {
                                eventState = 'enrolled';
                            } else {
                                eventState = 'alternative';
                            }
                            
                            const event = utils.sessionToEvent(
                                session, course, group, weekStart,
                                this.courseColors.get(course.CourseID),
                                eventState
                            );
                            events.push(event);
                        });
                    });
                }
            });
        });
        
        return events;
    }
    
    /**
     * Handle event click in planning mode
     */
    handlePlanningEventClick(info) {
        const props = info.event.extendedProps;
        
        // Only allow clicking on tutorials/seminars, not lectures
        if (props.groupType === 'LEC') {
            this.showEventDetails(props, info);
            return;
        }
        
        // Find enrollment for this course
        const enrollment = this.enrollment.find(e => e.CourseID === props.courseId);
        if (!enrollment) return;
        
        const enrolledGroupId = enrollment.EnrolledGroups[props.groupType];
        
        // If clicking on selected event, de-select it (revert to enrolled)
        if (props.eventState === 'selected') {
            this.planningState.selectTutorialGroup(
                props.courseId,
                props.groupType,
                enrolledGroupId,
                enrolledGroupId  // Set back to enrolled group
            );
            
            // Reload calendar and sidebar
            this.renderPlanningSidebar();
            this.loadWeek(this.currentTerm, this.currentWeek);
            return;
        }
        
        // If clicking on enrolled event, just show details
        if (props.eventState === 'enrolled') {
            this.showEventDetails(props, info);
            return;
        }
        
        // If clicking on alternative event, select it
        if (props.eventState === 'alternative') {
            this.planningState.selectTutorialGroup(
                props.courseId,
                props.groupType,
                enrolledGroupId,
                props.groupId
            );
            
            // Reload calendar and sidebar
            this.renderPlanningSidebar();
            this.loadWeek(this.currentTerm, this.currentWeek);
            return;
        }
    }
    
    /**
     * Show event details in an alert
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
            this.positionModal(clickEvent.jsEvent);
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
     * Position modal near the clicked element
     */
    positionModal(event) {
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
