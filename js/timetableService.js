// ======================================
// Timetable Data Service
// ======================================

import { supabase } from './supabaseClient.js';

/**
 * Service for managing user enrollment in Supabase
 */
export class EnrollmentService {
    constructor(authService) {
        this.authService = authService;
    }

    // ======================================
    // Enrollment Management
    // ======================================

    /**
     * Get the current user's enrollment record
     * @returns {Promise<{data, error}>}
     */
    async getUserEnrollment() {
        const userId = this.authService.getUserId();
        if (!userId) {
            return { data: null, error: new Error('User not authenticated') };
        }

        const { data, error } = await supabase
            .from('user_enrollment')
            .select('*')
            .eq('user_id', userId)
            .single();

        return { data, error };
    }

    /**
     * Create an enrollment record for the user (creates if doesn't exist)
     * @returns {Promise<{data, error}>}
     */
    async createOrGetEnrollment() {
        const userId = this.authService.getUserId();
        if (!userId) {
            return { data: null, error: new Error('User not authenticated') };
        }

        // Try to get existing enrollment
        const { data: existing } = await this.getUserEnrollment();
        if (existing) {
            return { data: existing, error: null };
        }

        // Create new enrollment if doesn't exist
        const { data, error } = await supabase
            .from('user_enrollment')
            .insert({
                user_id: userId
            })
            .select()
            .single();

        return { data, error };
    }

    // ======================================
    // Course Enrollment Management
    // ======================================

    /**
     * Get all courses in user's enrollment
     * @returns {Promise<{data, error}>}
     */
    async getEnrollmentCourses() {
        const userId = this.authService.getUserId();
        if (!userId) {
            return { data: null, error: new Error('User not authenticated') };
        }

        const { data, error } = await supabase
            .from('enrollment_courses')
            .select('*')
            .eq('user_id', userId);

        return { data, error };
    }

    /**
     * Get user's enrollment in enrollment.json format
     * @returns {Promise<{data, error}>} - data is enrollment object like {"EC333": {"LEC": 1, "CLA": 1}}
     */
    async getEnrollmentData() {
        // Get user's enrollment courses
        const { data: courses, error: coursesError } = await this.getEnrollmentCourses();
        
        if (coursesError) {
            return { data: null, error: coursesError };
        }

        // Convert to enrollment format
        const enrollmentData = this.convertToEnrollmentFormat(courses);
        return { data: enrollmentData, error: null };
    }

    /**
     * Convert course array to enrollment.json format
     * @private
     * @param {Array} courses - Array of timetable_courses records
     * @returns {Object} - Format: {"EC333": {"LEC": 1, "CLA": 1}}
     */
    convertToEnrollmentFormat(courses) {
        const enrollment = {};
        
        for (const course of courses) {
            if (!enrollment[course.course_code]) {
                enrollment[course.course_code] = {};
            }
            enrollment[course.course_code][course.session_type] = course.class_group;
        }
        
        return enrollment;
    }

    /**
     * Convert enrollment.json format to course array
     * @private
     * @param {Object} enrollment - Format: {"EC333": {"LEC": 1, "CLA": 1}}
     * @param {string} userId
     * @returns {Array} - Array of course objects for insertion
     */
    convertFromEnrollmentFormat(enrollment, userId) {
        const courses = [];
        
        for (const [courseCode, sessions] of Object.entries(enrollment)) {
            for (const [sessionType, classGroup] of Object.entries(sessions)) {
                courses.push({
                    user_id: userId,
                    course_code: courseCode,
                    session_type: sessionType,
                    class_group: classGroup
                });
            }
        }
        
        return courses;
    }

    /**
     * Add a course to user's enrollment
     * @param {string} courseCode
     * @param {string} sessionType - 'LEC', 'CLA', 'SEM', etc.
     * @param {number} classGroup
     * @returns {Promise<{data, error}>}
     */
    async addCourse(courseCode, sessionType, classGroup) {
        const userId = this.authService.getUserId();
        if (!userId) {
            return { data: null, error: new Error('User not authenticated') };
        }

        const { data, error } = await supabase
            .from('enrollment_courses')
            .insert({
                user_id: userId,
                course_code: courseCode,
                session_type: sessionType,
                class_group: classGroup
            })
            .select()
            .single();

        return { data, error };
    }

    /**
     * Update a course's class group
     * @param {string} courseCode
     * @param {string} sessionType
     * @param {number} newClassGroup
     * @returns {Promise<{data, error}>}
     */
    async updateCourse(courseCode, sessionType, newClassGroup) {
        const userId = this.authService.getUserId();
        if (!userId) {
            return { data: null, error: new Error('User not authenticated') };
        }

        const { data, error } = await supabase
            .from('enrollment_courses')
            .update({ class_group: newClassGroup })
            .eq('user_id', userId)
            .eq('course_code', courseCode)
            .eq('session_type', sessionType)
            .select()
            .single();

        return { data, error };
    }

    /**
     * Remove a course session from enrollment
     * @param {string} courseCode
     * @param {string} sessionType
     * @returns {Promise<{error}>}
     */
    async removeCourse(courseCode, sessionType) {
        const userId = this.authService.getUserId();
        if (!userId) {
            return { error: new Error('User not authenticated') };
        }

        const { error } = await supabase
            .from('enrollment_courses')
            .delete()
            .eq('user_id', userId)
            .eq('course_code', courseCode)
            .eq('session_type', sessionType);

        return { error };
    }

    /**
     * Remove all sessions of a course from enrollment
     * @param {string} courseCode
     * @returns {Promise<{error}>}
     */
    async removeAllCourseSessions(courseCode) {
        const userId = this.authService.getUserId();
        if (!userId) {
            return { error: new Error('User not authenticated') };
        }

        const { error } = await supabase
            .from('enrollment_courses')
            .delete()
            .eq('user_id', userId)
            .eq('course_code', courseCode);

        return { error };
    }

    /**
     * Replace all courses in user's enrollment with new data
     * @param {Object} enrollment - Format: {"EC333": {"LEC": 1, "CLA": 1}}
     * @returns {Promise<{error}>}
     */
    async replaceAllCourses(enrollment) {
        const userId = this.authService.getUserId();
        if (!userId) {
            return { error: new Error('User not authenticated') };
        }

        // Delete all existing courses
        const { error: deleteError } = await supabase
            .from('enrollment_courses')
            .delete()
            .eq('user_id', userId);

        if (deleteError) {
            return { error: deleteError };
        }

        // Insert new courses
        const courses = this.convertFromEnrollmentFormat(enrollment, userId);
        
        if (courses.length === 0) {
            return { error: null };
        }

        const { error: insertError } = await supabase
            .from('enrollment_courses')
            .insert(courses);

        return { error: insertError };
    }

    /**
     * Save enrollment data to user's enrollment
     * @param {Object} enrollment - Format: {"EC333": {"LEC": 1, "CLA": 1}}
     * @returns {Promise<{error}>}
     */
    async saveEnrollmentData(enrollment) {
        return this.replaceAllCourses(enrollment);
    }
}

export default EnrollmentService;
