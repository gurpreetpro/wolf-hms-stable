import client from '../api/client';

// ============================
// Insurance Service
// ============================
export interface PreAuthRequest {
  id: string;
  patient_name: string;
  patient_id: string;
  insurer: string;
  policy_number: string;
  procedure: string;
  estimated_cost: number;
  approved_amount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'query';
  submitted_date: string;
  response_date?: string;
  remarks?: string;
}

export interface InsuranceClaim {
  id: string;
  patient_name: string;
  claim_number: string;
  insurer: string;
  admission_id: string;
  bill_amount: number;
  claimed_amount: number;
  approved_amount?: number;
  settled_amount?: number;
  status: 'submitted' | 'under_review' | 'approved' | 'settled' | 'rejected';
  submission_date: string;
  tat_days?: number;
}

export interface TreatmentPackage {
  id: string;
  name: string;
  category: string;
  price: number;
  inclusions: string[];
  exclusions: string[];
  popular?: boolean;
  duration_days?: number;
}

const insuranceService = {
  // Pre-Authorization
  getPreAuthRequests: async (): Promise<PreAuthRequest[]> => {
    try {
      const res = await client.get('/insurance/pre-auth');
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('InsuranceService.getPreAuthRequests Error', error);
      throw error;
    }
  },

  submitPreAuth: async (data: Omit<PreAuthRequest, 'id' | 'status' | 'submitted_date'>) => {
    try {
      const res = await client.post('/insurance/pre-auth', data);
      return res.data;
    } catch (error) {
      console.error('InsuranceService.submitPreAuth Error', error);
      throw error;
    }
  },

  // Claims
  getClaims: async (status?: string): Promise<InsuranceClaim[]> => {
    try {
      const params = status ? `?status=${status}` : '';
      const res = await client.get(`/insurance/claims${params}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('InsuranceService.getClaims Error', error);
      throw error;
    }
  },

  submitClaim: async (data: { admission_id: string; insurer: string; claimed_amount: number }) => {
    try {
      const res = await client.post('/insurance/claims', data);
      return res.data;
    } catch (error) {
      console.error('InsuranceService.submitClaim Error', error);
      throw error;
    }
  },

  // Treatment Packages
  getPackages: async (category?: string): Promise<TreatmentPackage[]> => {
    try {
      const params = category ? `?category=${category}` : '';
      const res = await client.get(`/insurance/packages${params}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('InsuranceService.getPackages Error', error);
      throw error;
    }
  },
};

export default insuranceService;
