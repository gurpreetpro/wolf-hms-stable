import client from '../api/client';

export interface IntakeRecord {
  id: string;
  admission_id: string;
  type: 'oral' | 'iv' | 'ng_tube' | 'other';
  description: string;
  amount_ml: number;
  recorded_at: string;
  recorded_by?: string;
}

export interface OutputRecord {
  id: string;
  admission_id: string;
  type: 'urine' | 'stool' | 'vomit' | 'drain' | 'other';
  description?: string;
  amount_ml: number;
  recorded_at: string;
  recorded_by?: string;
}

export interface IOBalance {
  total_intake: number;
  total_output: number;
  net_balance: number;
  records: (IntakeRecord | OutputRecord)[];
}

const ioChartService = {
  // Log intake
  logIntake: async (data: {
    admission_id: string;
    type: IntakeRecord['type'];
    description: string;
    amount_ml: number;
  }): Promise<IntakeRecord> => {
    try {
      const response = await client.post('/ward/io-chart/intake', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('IOChartService.logIntake Error', error);
      throw error;
    }
  },

  // Log output
  logOutput: async (data: {
    admission_id: string;
    type: OutputRecord['type'];
    description?: string;
    amount_ml: number;
  }): Promise<OutputRecord> => {
    try {
      const response = await client.post('/ward/io-chart/output', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('IOChartService.logOutput Error', error);
      throw error;
    }
  },

  // Get I/O history for an admission
  getIOHistory: async (admissionId: string, date?: string): Promise<(IntakeRecord | OutputRecord)[]> => {
    try {
      let url = `/ward/io-chart/${admissionId}`;
      if (date) url += `?date=${date}`;
      const response = await client.get(url);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('IOChartService.getIOHistory Error', error);
      return [];
    }
  },

  // Get 24-hour balance
  get24HourBalance: async (admissionId: string): Promise<IOBalance> => {
    try {
      const response = await client.get(`/ward/io-chart/${admissionId}/balance`);
      return response.data.data || response.data || { total_intake: 0, total_output: 0, net_balance: 0, records: [] };
    } catch (error) {
      console.error('IOChartService.get24HourBalance Error', error);
      return { total_intake: 0, total_output: 0, net_balance: 0, records: [] };
    }
  },

  // Calculate balance from records
  calculateBalance: (records: (IntakeRecord | OutputRecord)[]): IOBalance => {
    let totalIntake = 0;
    let totalOutput = 0;

    records.forEach((r: any) => {
      if (r.type === 'oral' || r.type === 'iv' || r.type === 'ng_tube') {
        totalIntake += r.amount_ml || 0;
      } else {
        totalOutput += r.amount_ml || 0;
      }
    });

    return {
      total_intake: totalIntake,
      total_output: totalOutput,
      net_balance: totalIntake - totalOutput,
      records,
    };
  },
};

export default ioChartService;
