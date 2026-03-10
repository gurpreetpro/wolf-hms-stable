import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  username?: string; // Added for DoctorHomeScreen fallback
  role: 'doctor' | 'nurse' | 'ward_incharge' | 'admin' | 'rmo' | 'pharmacist' | 'lab_tech' | 'receptionist' | 'radiologist' | 'physiotherapist' | 'dietitian' | 'biomed_engineer' | 'cssd_tech' | 'blood_bank_tech' | 'medical_records';
  department?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hospitalId: number | null;
  baseUrl: string | null;  // Dynamic API URL
  hospitalCode: string | null; // User-facing code (e.g., 'kokila')
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string, hospitalId: number) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setHospitalId: (id: number) => void;
  setConnection: (baseUrl: string, hospitalCode: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hospitalId: null,
  baseUrl: null,
  hospitalCode: null,
  isAuthenticated: false,
  isLoading: false,
  login: (user, token, hospitalId) => set({ user, token, hospitalId, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, hospitalId: null, isAuthenticated: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setHospitalId: (id) => set({ hospitalId: id }),
  setConnection: (baseUrl, hospitalCode) => set({ baseUrl, hospitalCode }),
}));
