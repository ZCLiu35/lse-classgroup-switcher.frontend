// ======================================
// Sidebar Manager - Handles sidebar rendering and interactions
// ======================================

/**
 * Manages sidebar rendering and interactions for both viewing and planning modes
 */
export class SidebarManager {
    constructor(app) {
        this.app = app;
    }

    /**
     * Render viewing mode sidebar with enrolled courses
     */
    renderViewingSidebar() {
        const container = document.getElementById('enrolledCoursesList');
        container.innerHTML = '';
        
        // Get enrolled courses for current term
        const enrolledCourses = this.app.getEnrolledCoursesForTerm(this.app.currentTerm);
        
        enrolledCourses.forEach(course => {
            const enrollment = this.app.enrollment.find(e => e.CourseID === course.CourseID);
            if (!enrollment) return;
            
            const colorData = this.app.courseColors.get(course.CourseID);
            const colorClass = `course-color-${colorData.index}`;
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            
            // Build enrolled groups display (exclude lectures)
            let groupsHTML = '';
            Object.entries(enrollment.EnrolledGroups).forEach(([type, groupId]) => {
                // Skip lectures in the display
                if (type === 'LEC') return;
                
                const group = this.app.groups.find(g => g.GroupID === groupId);
                if (group) {
                    const typeLabel = type === 'CLA' ? 'Class' : 
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
     * Render planning mode sidebar with course filters
     */
    renderPlanningSidebar() {
        const container = document.getElementById('courseFiltersList');
        container.innerHTML = '';
        
        const enrolledCourses = this.app.getEnrolledCoursesForTerm(this.app.currentTerm);
        
        enrolledCourses.forEach(course => {
            const enrollment = this.app.enrollment.find(e => e.CourseID === course.CourseID);
            if (!enrollment) return;
            
            const colorData = this.app.courseColors.get(course.CourseID);
            const colorClass = `course-color-${colorData.index}`;
            const isVisible = this.app.planningState.visibleCourses.has(course.CourseID);
            const changes = this.app.planningState.getChangesForCourse(course.CourseID);
            const showMode = this.app.planningState.showAlternatives.get(course.CourseID) || 'my';
            
            // Get tutorial/seminar groups (not lectures)
            const tutorialTypes = Object.keys(enrollment.EnrolledGroups).filter(type => type !== 'LEC');
            
            const filterItem = document.createElement('div');
            filterItem.className = 'course-filter-item';
            
            // Build change indicator
            let changeText = '';
            if (changes.length > 0) {
                const changeDescriptions = changes.map(ch => {
                    const fromGroup = this.app.groups.find(g => g.GroupID === ch.from);
                    const toGroup = this.app.groups.find(g => g.GroupID === ch.to);
                    return `${ch.groupType}${fromGroup?.GroupNumber}→${toGroup?.GroupNumber}`;
                });
                changeText = ` (${changeDescriptions.join(', ')})`;
            }
            
            // Count available groups (tutorials/seminars only)
            const availableGroups = this.app.groups.filter(g => 
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
                    <div class="toggle-switch-container">
                        <span class="toggle-label ${showMode === 'my' ? 'active' : ''}">My Sessions</span>
                        <label class="toggle-switch" data-course-id="${course.CourseID}">
                            <input type="checkbox" 
                                   class="toggle-input" 
                                   ${showMode === 'all' ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label ${showMode === 'all' ? 'active' : ''}">All Sessions</span>
                    </div>
                </div>
                <div class="course-filter-info">Available: ${availableGroups.length} groups</div>
            `;
            
            container.appendChild(filterItem);
            
            // Add event listeners for this filter item
            this._attachPlanningFilterListeners(filterItem, course.CourseID);
        });
    }

    /**
     * Attach event listeners to planning filter item
     * @private
     */
    _attachPlanningFilterListeners(filterItem, courseId) {
        // Checkbox for course visibility
        const checkbox = filterItem.querySelector('.course-filter-checkbox');
        checkbox.addEventListener('change', (e) => {
            this.app.planningState.toggleCourseVisibility(courseId);
            this.app._debouncedSavePlanningState();
            this.app.loadWeek(this.app.currentTerm, this.app.currentWeek);
        });
        
        // Toggle switch for showing alternatives
        const toggleSwitch = filterItem.querySelector('.toggle-switch');
        const toggleInput = filterItem.querySelector('.toggle-input');
        toggleInput.addEventListener('change', (e) => {
            const newMode = e.target.checked ? 'all' : 'my';
            this.app.planningState.setAlternativeMode(courseId, newMode);
            this.app._debouncedSavePlanningState();
            this.renderPlanningSidebar(); // Re-render to update toggle state
            this.app.loadWeek(this.app.currentTerm, this.app.currentWeek);
        });
    }

    /**
     * Update sidebar visibility based on planning mode
     */
    updateSidebarVisibility(isPlanning) {
        const viewingSidebar = document.getElementById('viewingSidebar');
        const planningSidebar = document.getElementById('planningSidebar');
        
        if (isPlanning) {
            viewingSidebar.classList.add('hidden');
            planningSidebar.classList.remove('hidden');
        } else {
            viewingSidebar.classList.remove('hidden');
            planningSidebar.classList.add('hidden');
        }
    }
}
