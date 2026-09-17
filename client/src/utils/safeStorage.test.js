import { describe, it, expect, beforeEach } from 'vitest';
import { 
    safeGetUser, 
    safeSetUser, 
    safeSetToken, 
    clearAuth, 
    isAuthenticated 
} from './safeStorage';

describe('safeStorage Utilities', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('safeGetUser()', () => {
        it('should return null when user is missing or falsy', () => {
            expect(safeGetUser()).toBeNull();
        });

        it('should return null when user is literal string "undefined"', () => {
            localStorage.setItem('user', 'undefined');
            expect(safeGetUser()).toBeNull();
        });

        it('should return null and clean up when JSON is corrupted', () => {
            localStorage.setItem('user', '{corrupted-json');
            expect(safeGetUser()).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
        });

        it('should correctly parse valid user JSON object', () => {
            const user = { id: 1, name: 'Dr. Rao', role: 'doctor' };
            localStorage.setItem('user', JSON.stringify(user));
            expect(safeGetUser()).toEqual(user);
        });
    });

    describe('safeSetUser() and clearAuth()', () => {
        it('should store valid user object', () => {
            const user = { id: 2, name: 'Nurse Priya' };
            expect(safeSetUser(user)).toBe(true);
            expect(JSON.parse(localStorage.getItem('user'))).toEqual(user);
        });

        it('should clear user and token on clearAuth()', () => {
            localStorage.setItem('user', JSON.stringify({ id: 1 }));
            localStorage.setItem('token', 'valid-jwt');
            clearAuth();
            expect(localStorage.getItem('user')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
        });
    });

    describe('isAuthenticated()', () => {
        it('should return true only when both token and valid user exist', () => {
            expect(isAuthenticated()).toBe(false);

            localStorage.setItem('token', 'my-token');
            expect(isAuthenticated()).toBe(false);

            localStorage.setItem('user', JSON.stringify({ id: 1 }));
            expect(isAuthenticated()).toBe(true);
        });
    });
});
