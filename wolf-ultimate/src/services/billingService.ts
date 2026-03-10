import client from '../api/client';

// ============================
// Billing Service
// ============================
export interface Bill {
  id: string;
  patient_name: string;
  patient_id: string;
  admission_id?: string;
  bill_number: string;
  date: string;
  total: number;
  paid: number;
  discount: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  items: BillItem[];
}

export interface BillItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  rate: number;
  amount: number;
}

const billingService = {
  getBills: async (status?: string): Promise<Bill[]> => {
    try {
      const params = status ? `?status=${status}` : '';
      const res = await client.get(`/billing/bills${params}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error('BillingService.getBills Error', error);
      throw error;
    }
  },

  getBillById: async (billId: string): Promise<Bill> => {
    try {
      const res = await client.get(`/billing/bills/${billId}`);
      return res.data?.data || res.data;
    } catch (error) {
      console.error('BillingService.getBillById Error', error);
      throw error;
    }
  },

  addCharge: async (data: { admission_id: string; description: string; category: string; quantity: number; rate: number }) => {
    try {
      const res = await client.post('/billing/charges', data);
      return res.data;
    } catch (error) {
      console.error('BillingService.addCharge Error', error);
      throw error;
    }
  },

  collectPayment: async (billId: string, amount: number, mode: string) => {
    try {
      const res = await client.post(`/billing/bills/${billId}/pay`, { amount, mode });
      return res.data;
    } catch (error) {
      console.error('BillingService.collectPayment Error', error);
      throw error;
    }
  },
};

export default billingService;
