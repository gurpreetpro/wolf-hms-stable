import client from '../api/client';

// ============================
// ABDM / ABHA Service
// ============================
export interface ABHARecord {
  id: string;
  patient_name: string;
  patient_id: string;
  abha_number: string;
  abha_address?: string;
  linked_date: string;
  consent_status: 'granted' | 'pending' | 'revoked';
  records_count: number;
}

const abdmService = {
  getLinkedRecords: async (): Promise<ABHARecord[]> => {
    try {
      const res = await client.get('/abdm/linked-records');
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('ABDMService.getLinkedRecords Error', error);
      throw error;
    }
  },

  createABHA: async (data: { aadhaar: string; otp?: string }) => {
    try {
      const res = await client.post('/abdm/create-abha', data);
      return res.data;
    } catch (error) {
      console.error('ABDMService.createABHA Error', error);
      throw error;
    }
  },

  verifyOTP: async (txnId: string, otp: string) => {
    try {
      const res = await client.post('/abdm/verify-otp', { txn_id: txnId, otp });
      return res.data;
    } catch (error) {
      console.error('ABDMService.verifyOTP Error', error);
      throw error;
    }
  },

  linkRecord: async (patientId: string, abhaNumber: string) => {
    try {
      const res = await client.post('/abdm/link', { patient_id: patientId, abha_number: abhaNumber });
      return res.data;
    } catch (error) {
      console.error('ABDMService.linkRecord Error', error);
      throw error;
    }
  },
};

export default abdmService;
