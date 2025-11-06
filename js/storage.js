// ======================================
// localStorage Persistence Layer
// ======================================

const STORAGE_KEYS = {
    COURSE_COLORS: 'classSwitcher_courseColors',
    MODE: 'classSwitcher_mode',
    PLANNING_STATE: 'classSwitcher_planningState',
    ENROLLMENT_OVERRIDES: 'classSwitcher_enrollmentOverrides'
};

/**
 * Storage Manager for Class Switcher App
 */
export class StorageManager {
    constructor() {
        this.available = this.checkAvailability();
    }

    /**
     * Check if localStorage is available
     */
    checkAvailability() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage is not available:', e);
            return false;
        }
    }

    /**
     * Generic save method
     * @private
     */
    _save(key, data) {
        if (!this.available) return;
        localStorage.setItem(key, JSON.stringify(data));
    }

    /**
     * Generic load method
     * @private
     */
    _load(key, defaultValue = null) {
        if (!this.available) return defaultValue;
        
        const stored = localStorage.getItem(key);
        if (!stored) return defaultValue;
        
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error(`Failed to parse ${key}:`, e);
            return defaultValue;
        }
    }

    /**
     * Generic remove method
     * @private
     */
    _remove(key) {
        if (!this.available) return;
        localStorage.removeItem(key);
    }

    // ======================================
    // Course Colors
    // ======================================

    saveCourseColors(courseColors) {
        this._save(STORAGE_KEYS.COURSE_COLORS, Object.fromEntries(courseColors));
    }

    loadCourseColors() {
        const colorsObj = this._load(STORAGE_KEYS.COURSE_COLORS);
        return colorsObj ? new Map(Object.entries(colorsObj)) : null;
    }

    // ======================================
    // App Mode
    // ======================================

    saveMode(mode) {
        this._save(STORAGE_KEYS.MODE, mode);
    }

    loadMode() {
        return this._load(STORAGE_KEYS.MODE, 'viewing');
    }

    // ======================================
    // Planning State (Preferences Only)
    // ======================================

    /**
     * Save planning preferences (visibility and toggle settings)
     * Note: Does NOT save staged changes - those are session-only
     */
    savePlanningState(state) {
        this._save(STORAGE_KEYS.PLANNING_STATE, {
            visibleCourses: Array.from(state.visibleCourses),
            showAlternatives: Object.fromEntries(state.showAlternatives)
        });
    }

    loadPlanningState() {
        return this._load(STORAGE_KEYS.PLANNING_STATE);
    }

    clearPlanningState() {
        this._remove(STORAGE_KEYS.PLANNING_STATE);
    }

    // ======================================
    // Enrollment Overrides
    // ======================================

    saveEnrollmentOverrides(overrides) {
        this._save(STORAGE_KEYS.ENROLLMENT_OVERRIDES, overrides);
    }

    loadEnrollmentOverrides() {
        return this._load(STORAGE_KEYS.ENROLLMENT_OVERRIDES, {});
    }

    // ======================================
    // Utility Methods
    // ======================================

    clearAll() {
        if (!this.available) return;
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        console.log('All localStorage data cleared');
    }

    getStorageInfo() {
        if (!this.available) return null;
        
        return Object.fromEntries(
            Object.entries(STORAGE_KEYS).map(([name, key]) => {
                const value = localStorage.getItem(key);
                return [name, { exists: !!value, size: value?.length || 0 }];
            })
        );
    }
}

export default StorageManager;