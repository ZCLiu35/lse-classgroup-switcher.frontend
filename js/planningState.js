// ======================================
// Planning Mode State Management
// ======================================

import { detectConflicts } from './conflictDetector.js';
import * as utils from './utils.js';

/**
 * Manages the state and logic for Planning Mode
 * Tracks user selections, visibility, staged changes, and event generation
 */
export class PlanningState {
    constructor(app) {
        // Reference to main app for accessing data
        this.app = app;
        
        // Current mode: 'viewing' or 'planning'
        this.mode = 'viewing';
        
        // Staged changes: { courseId_groupType: { courseId, groupType, from: groupNumber, to: groupNumber } }
        this.stagedChanges = new Map();
        
        // Visible courses in planning mode: Set of courseIds
        this.visibleCourses = new Set();
        
        // Show alternatives mode: { courseId: 'my' | 'all' }
        this.showAlternatives = new Map();
        
        // Conflict tracking
        this.conflictingEventIds = new Set();
    }

    /**
     * Enter planning mode
     * @param {Array} enrolledCourses - List of enrolled courses
     */
    enterPlanningMode(enrolledCourses) {
        this.mode = 'planning';
        
        // Initialize all courses as visible
        enrolledCourses.forEach(course => {
            this.visibleCourses.add(course.CourseCode);
            this.showAlternatives.set(course.CourseCode, 'my'); // Default to 'my' view
        });
        
        // Clear any previous staged changes
        this.stagedChanges.clear();
        this.conflictingEventIds.clear();
    }

    /**
     * Exit planning mode and return to viewing mode
     * @param {string} action - 'cancel', 'save', or 'apply'
     * @returns {Map|null} - The staged changes if action is 'save' or 'apply'
     */
    exitPlanningMode(action) {
        const changes = action !== 'cancel' ? new Map(this.stagedChanges) : null;
        
        this.mode = 'viewing';
        this.visibleCourses.clear();
        this.showAlternatives.clear();
        this.conflictingEventIds.clear();
        
        if (action === 'cancel') {
            this.stagedChanges.clear();
        }
        
        return changes;
    }

    /**
     * Restore preferences from saved state (not staged changes)
     * @param {Object} savedState - Saved planning preferences
     */
    restorePreferences(savedState) {
        if (savedState.visibleCourses) {
            this.visibleCourses = new Set(savedState.visibleCourses);
        }
        if (savedState.showAlternatives) {
            this.showAlternatives = new Map(Object.entries(savedState.showAlternatives));
        }
    }

    /**
     * Get current preferences (for saving)
     * @returns {Object} - Preferences object
     */
    getPreferences() {
        return {
            visibleCourses: this.visibleCourses,
            showAlternatives: this.showAlternatives
        };
    }

    /**
     * Toggle course visibility
     * @param {string} courseId
     */
    toggleCourseVisibility(courseId) {
        if (this.visibleCourses.has(courseId)) {
            this.visibleCourses.delete(courseId);
        } else {
            this.visibleCourses.add(courseId);
        }
    }

    /**
     * Set alternative display mode for a course
     * @param {string} courseId
     * @param {string} mode - 'my' or 'all'
     */
    setAlternativeMode(courseId, mode) {
        this.showAlternatives.set(courseId, mode);
    }

    /**
     * Select a tutorial group for a course
     * @param {string} courseId
     * @param {string} groupType - 'CLA' or 'SEM'
     * @param {number} fromGroupNumber - Current enrolled group number
     * @param {number} toGroupNumber - Selected group number
     */
    selectTutorialGroup(courseId, groupType, fromGroupNumber, toGroupNumber) {
        const key = `${courseId}_${groupType}`;
        
        if (fromGroupNumber === toGroupNumber) {
            // If selecting the same as enrolled, remove the staged change
            this.stagedChanges.delete(key);
        } else {
            // Store the staged change
            this.stagedChanges.set(key, {
                courseId,
                groupType,
                from: fromGroupNumber,
                to: toGroupNumber
            });
        }
    }

    /**
     * Get the selected group for a course (considering staged changes)
     * @param {string} courseId
     * @param {string} groupType
     * @param {number} enrolledGroupNumber - Currently enrolled group number
     * @returns {number} - The group number (either staged or enrolled)
     */
    getSelectedGroup(courseId, groupType, enrolledGroupNumber) {
        const key = `${courseId}_${groupType}`;
        const stagedChange = this.stagedChanges.get(key);
        
        return stagedChange ? stagedChange.to : enrolledGroupNumber;
    }

    /**
     * Get all staged changes for a course
     * @param {string} courseId
     * @returns {Array} - Array of change objects
     */
    getChangesForCourse(courseId) {
        const changes = [];
        for (const [key, change] of this.stagedChanges) {
            if (change.courseId === courseId) {
                changes.push(change);
            }
        }
        return changes;
    }

    /**
     * Check if currently in planning mode
     * @returns {boolean}
     */
    isPlanning() {
        return this.mode === 'planning';
    }

    /**
     * Get count of total staged changes
     * @returns {number}
     */
    getChangeCount() {
        return this.stagedChanges.size;
    }

    /**
     * Generate events for planning mode (includes alternatives)
     * @param {string} termCode - Term code
     * @param {number} weekNumber - Week number
     * @param {Date} weekStart - Start date of the week
     * @returns {Array} - Array of calendar events
     */
    getEventsForPlanningMode(termCode, weekNumber, weekStart) {
        const events = [];
        const enrolledCourses = this.app.getEnrolledCoursesForTerm(termCode);
        
        enrolledCourses.forEach(course => {
            // Skip if course is hidden
            if (!this.visibleCourses.has(course.CourseCode)) {
                return;
            }
            
            const enrollment = this.app.enrollment[course.CourseCode];
            if (!enrollment) return;
            
            const colorData = this.app.courseColors.get(course.CourseCode);
            const colorClass = `course-color-${colorData.index}`;
            
            const showMode = this.showAlternatives.get(course.CourseCode) || 'my';
            
            // Add all enrolled lectures (always show)
            this._addLectureEvents(events, course, enrollment, termCode, weekNumber, weekStart, colorClass);
            
            // Add tutorials/seminars based on mode
            const tutorialTypes = Object.keys(enrollment).filter(t => t !== 'LEC');
            
            tutorialTypes.forEach(groupType => {
                const enrolledGroupNumber = enrollment[groupType];
                const selectedGroupNumber = this.getSelectedGroup(
                    course.CourseCode, groupType, enrolledGroupNumber
                );
                
                if (showMode === 'my') {
                    this._addMySessionsEvents(
                        events, course, groupType, enrolledGroupNumber, selectedGroupNumber,
                        termCode, weekNumber, weekStart, colorClass
                    );
                } else {
                    this._addAllSessionsEvents(
                        events, course, groupType, enrolledGroupNumber, selectedGroupNumber,
                        termCode, weekNumber, weekStart, colorClass
                    );
                }
            });
        });
        
        // Detect and mark conflicts
        this.conflictingEventIds = detectConflicts(events);
        events.forEach(event => {
            if (this.conflictingEventIds.has(event.id)) {
                if (!Array.isArray(event.classNames)) {
                    event.classNames = [];
                }
                event.classNames.push('event-conflict');
            }
        });
        
        return events;
    }

    /**
     * Add lecture events
     * @private
     */
    _addLectureEvents(events, course, enrollment, termCode, weekNumber, weekStart, colorClass) {
        Object.entries(enrollment).forEach(([groupType, groupNumber]) => {
            if (groupType !== 'LEC') return;
            
            const groupSessions = this.app.sessions[course.CourseCode]?.[groupType]?.[groupNumber]?.[termCode];
            if (!groupSessions) return;
            
            const weekSessions = groupSessions.filter(s => s.Week === weekNumber);
            weekSessions.forEach(session => {
                const group = {
                    CourseCode: course.CourseCode,
                    CourseName: course.CourseName,
                    Type: groupType,
                    GroupNumber: groupNumber
                };
                
                const event = utils.sessionToEvent(
                    session, course, group, weekStart,
                    colorClass,
                    'lecture'
                );
                events.push(event);
            });
        });
    }

    /**
     * Add "my sessions" events (enrolled + selected)
     * @private
     */
    _addMySessionsEvents(events, course, groupType, enrolledGroupNumber, selectedGroupNumber, 
                         termCode, weekNumber, weekStart, colorClass) {
        const groupsToShow = new Set([enrolledGroupNumber, selectedGroupNumber]);
        
        groupsToShow.forEach(groupNumber => {
            const groupSessions = this.app.sessions[course.CourseCode]?.[groupType]?.[groupNumber]?.[termCode];
            if (!groupSessions) return;
            
            const weekSessions = groupSessions.filter(s => s.Week === weekNumber);
            weekSessions.forEach(session => {
                let eventState;
                if (groupNumber === selectedGroupNumber && groupNumber !== enrolledGroupNumber) {
                    eventState = 'selected';
                } else {
                    eventState = 'enrolled';
                }
                
                const group = {
                    CourseCode: course.CourseCode,
                    CourseName: course.CourseName,
                    Type: groupType,
                    GroupNumber: groupNumber
                };
                
                const event = utils.sessionToEvent(
                    session, course, group, weekStart,
                    colorClass,
                    eventState
                );
                events.push(event);
            });
        });
    }

    /**
     * Add "all sessions" events (all available groups)
     * @private
     */
    _addAllSessionsEvents(events, course, groupType, enrolledGroupNumber, selectedGroupNumber,
                          termCode, weekNumber, weekStart, colorClass) {
        // Get all available group numbers for this course and type
        const availableGroups = Object.keys(this.app.sessions[course.CourseCode]?.[groupType] || {});
        
        availableGroups.forEach(groupNumberStr => {
            const groupNumber = parseInt(groupNumberStr);
            const groupSessions = this.app.sessions[course.CourseCode]?.[groupType]?.[groupNumber]?.[termCode];
            if (!groupSessions) return;
            
            const weekSessions = groupSessions.filter(s => s.Week === weekNumber);
            weekSessions.forEach(session => {
                let eventState;
                if (groupNumber === selectedGroupNumber && groupNumber !== enrolledGroupNumber) {
                    eventState = 'selected';
                } else if (groupNumber === enrolledGroupNumber) {
                    eventState = 'enrolled';
                } else {
                    eventState = 'alternative';
                }
                
                const group = {
                    CourseCode: course.CourseCode,
                    CourseName: course.CourseName,
                    Type: groupType,
                    GroupNumber: groupNumber
                };
                
                const event = utils.sessionToEvent(
                    session, course, group, weekStart,
                    colorClass,
                    eventState
                );
                events.push(event);
            });
        });
    }

    /**
     * Handle event click in planning mode
     * @param {Object} info - FullCalendar event click info
     * @param {Function} showDetailsCallback - Callback to show event details
     * @param {Function} reloadCallback - Callback to reload calendar/sidebar
     */
    handleEventClick(info, showDetailsCallback, reloadCallback) {
        const props = info.event.extendedProps;
        
        // Only allow clicking on tutorials/seminars, not lectures
        if (props.groupType === 'LEC') {
            showDetailsCallback(props, info);
            return;
        }
        
        // Find enrollment for this course
        const enrollment = this.app.enrollment[props.courseId];
        if (!enrollment) return;
        
        const enrolledGroupNumber = enrollment[props.groupType];
        
        // If clicking on selected event, de-select it (revert to enrolled)
        if (props.eventState === 'selected') {
            this.selectTutorialGroup(
                props.courseId,
                props.groupType,
                enrolledGroupNumber,
                enrolledGroupNumber  // Set back to enrolled group
            );
            reloadCallback();
            return;
        }
        
        // If clicking on enrolled event, just show details
        if (props.eventState === 'enrolled') {
            showDetailsCallback(props, info);
            return;
        }
        
        // If clicking on alternative event, select it
        if (props.eventState === 'alternative') {
            this.selectTutorialGroup(
                props.courseId,
                props.groupType,
                enrolledGroupNumber,
                props.groupNumber
            );
            reloadCallback();
            return;
        }
    }

    /**
     * Validate and apply changes
     * @param {Function} applyCallback - Callback to apply changes to enrollment
     * @returns {Object} - Result object with success status and message
     */
    applyChanges(applyCallback) {
        // Check for conflicts first
        if (this.conflictingEventIds.size > 0) {
            const confirmApply = confirm(
                `You have ${this.conflictingEventIds.size / 2} scheduling conflict(s). ` +
                `Are you sure you want to apply these changes?`
            );
            if (!confirmApply) {
                return { success: false, message: 'Application cancelled' };
            }
        }
        
        if (this.stagedChanges.size === 0) {
            return { success: false, message: 'No changes to apply' };
        }
        
        // Apply changes through callback
        applyCallback(this.stagedChanges);
        
        // Clear staged changes
        const changeCount = this.stagedChanges.size;
        this.stagedChanges.clear();
        
        return { 
            success: true, 
            message: `Successfully applied ${changeCount} change(s)!`,
            changeCount
        };
    }
}

