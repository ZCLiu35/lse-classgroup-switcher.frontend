// ======================================
// Planning Mode State Management
// ======================================

/**
 * Manages the state for Planning Mode
 * Tracks user selections, visibility, and staged changes
 */
export class PlanningState {
    constructor() {
        // Current mode: 'viewing' or 'planning'
        this.mode = 'viewing';
        
        // Staged changes: { courseId: { from: groupId, to: groupId } }
        this.stagedChanges = new Map();
        
        // Visible courses in planning mode: Set of courseIds
        this.visibleCourses = new Set();
        
        // Show alternatives mode: { courseId: 'my' | 'all' }
        this.showAlternatives = new Map();
    }

    /**
     * Enter planning mode
     * @param {Array} enrolledCourses - List of enrolled courses
     */
    enterPlanningMode(enrolledCourses) {
        this.mode = 'planning';
        
        // Initialize all courses as visible
        enrolledCourses.forEach(course => {
            this.visibleCourses.add(course.CourseID);
            this.showAlternatives.set(course.CourseID, 'my'); // Default to 'my' view
        });
        
        // Clear any previous staged changes
        this.stagedChanges.clear();
    }

    /**
     * Exit planning mode and return to viewing mode
     * @param {string} action - 'cancel', 'save', or 'apply'
     * @returns {Map} - The staged changes if action is 'save' or 'apply'
     */
    exitPlanningMode(action) {
        const changes = action !== 'cancel' ? new Map(this.stagedChanges) : null;
        
        this.mode = 'viewing';
        this.visibleCourses.clear();
        this.showAlternatives.clear();
        
        if (action === 'cancel') {
            this.stagedChanges.clear();
        }
        
        return changes;
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
     * @param {string} fromGroupId - Current enrolled group ID
     * @param {string} toGroupId - Selected group ID
     */
    selectTutorialGroup(courseId, groupType, fromGroupId, toGroupId) {
        const key = `${courseId}_${groupType}`;
        
        if (fromGroupId === toGroupId) {
            // If selecting the same as enrolled, remove the staged change
            this.stagedChanges.delete(key);
        } else {
            // Store the staged change
            this.stagedChanges.set(key, {
                courseId,
                groupType,
                from: fromGroupId,
                to: toGroupId
            });
        }
    }

    /**
     * Get the selected group for a course (considering staged changes)
     * @param {string} courseId
     * @param {string} groupType
     * @param {string} enrolledGroupId - Currently enrolled group
     * @returns {string} - The group ID (either staged or enrolled)
     */
    getSelectedGroup(courseId, groupType, enrolledGroupId) {
        const key = `${courseId}_${groupType}`;
        const stagedChange = this.stagedChanges.get(key);
        
        return stagedChange ? stagedChange.to : enrolledGroupId;
    }

    /**
     * Check if a course has staged changes
     * @param {string} courseId
     * @returns {boolean}
     */
    hasChanges(courseId) {
        for (const [key, change] of this.stagedChanges) {
            if (change.courseId === courseId) {
                return true;
            }
        }
        return false;
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
}
