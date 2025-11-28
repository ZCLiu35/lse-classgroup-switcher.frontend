// ======================================
// Authentication Service
// ======================================

import { supabase } from './supabaseClient.js';

/**
 * Authentication manager for user signup, login, logout
 */
export class AuthService {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
    }

    /**
     * Initialize auth state and set up listener
     */
    async initialize() {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        this.currentUser = session?.user || null;

        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            this.notifyListeners(event, session?.user);
        });

        return this.currentUser;
    }

    /**
     * Register a callback for auth state changes
     * @param {Function} callback - Called with (event, user)
     */
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
    }

    /**
     * Notify all listeners of auth state change
     * @private
     */
    notifyListeners(event, user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }

    /**
     * Sign up a new user with email and password
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{user, error}>}
     */
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            console.error('Sign up error:', error);
            return { user: null, error };
        }

        return { user: data.user, error: null };
    }

    /**
     * Sign in existing user with email and password
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{user, error}>}
     */
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('Sign in error:', error);
            return { user: null, error };
        }

        return { user: data.user, error: null };
    }

    /**
     * Sign out current user
     * @returns {Promise<{error}>}
     */
    async signOut() {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Sign out error:', error);
        }

        return { error };
    }

    /**
     * Send password reset email
     * @param {string} email
     * @returns {Promise<{error}>}
     */
    async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password'
        });

        if (error) {
            console.error('Password reset error:', error);
        }

        return { error };
    }

    /**
     * Get current user
     * @returns {User|null}
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Get user ID
     * @returns {string|null}
     */
    getUserId() {
        return this.currentUser?.id || null;
    }

    /**
     * Get user email
     * @returns {string|null}
     */
    getUserEmail() {
        return this.currentUser?.email || null;
    }
}

export default AuthService;
