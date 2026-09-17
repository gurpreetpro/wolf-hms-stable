import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
}));

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn().mockImplementation((url) => {
            if (url.includes('/api/auth/users')) return Promise.resolve({ data: [] });
            if (url.includes('/api/opd/queue')) return Promise.resolve({ data: [] });
            if (url.includes('/api/admissions/active')) return Promise.resolve({ data: [] });
            if (url.includes('/api/emergency/status')) return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        })
    }
}));

// Mock sub-components that render heavy charts
vi.mock('../components/RevenueChart', () => ({
    default: () => <div data-testid="revenue-chart">Revenue Chart Mock</div>
}));
vi.mock('../components/PatientTrendChart', () => ({
    default: () => <div data-testid="patient-trend-chart">Patient Trend Chart Mock</div>
}));
vi.mock('../components/MorningBriefing', () => ({
    default: () => <div data-testid="morning-briefing">Morning Briefing Mock</div>
}));
vi.mock('../components/ActivityFeed', () => ({
    default: () => <div data-testid="activity-feed">Activity Feed Mock</div>
}));
vi.mock('../components/settings/SettingsModal', () => ({
    default: () => null
}));

// Mock safeStorage
vi.mock('../utils/safeStorage', () => ({
    safeGetUser: () => ({ id: 1, name: 'Admin', role: 'admin' })
}));

// Mock socket
vi.mock('../services/socket', () => ({
    connectSocket: vi.fn(),
    getSocket: vi.fn().mockReturnValue(null),
    disconnectSocket: vi.fn()
}));

describe('Dashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders all operational module tiles (asserts >= 40 tiles)', async () => {
        const { container } = render(<Dashboard />);

        await waitFor(() => {
            const moduleCards = container.querySelectorAll('.module-card');
            expect(moduleCards.length).toBeGreaterThanOrEqual(40);
        });
    });

    it('renders live operational modules section header and badge', async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText(/Live Operational Modules/i)).toBeDefined();
            // Header badge showing module count
            expect(screen.getByText(/47 modules/i)).toBeDefined();
        });
    });

    it('renders module cards for clinical and support departments', async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Emergency / Casualty')).toBeDefined();
            expect(screen.getByText('Security & Tactical')).toBeDefined();
            expect(screen.getByText('ICU')).toBeDefined();
        });
    });
});
