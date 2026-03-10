import client from '../api/client';

export interface ChemoSession {
  id: string;
  patient_id: string;
  patient_name: string;
  cycle_number: number;
  protocol_name: string;
  drug_name: string;
  dosage: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Reaction';
  start_time: string;
  end_time?: string;
  notes?: string;
}

export interface DialysisSession {
  id: string;
  patient_id: string;
  patient_name: string;
  machine_id: string;
  status: 'Pre-Check' | 'Active' | 'Completed' | 'Alarm';
  bp_start: string;
  bp_end?: string;
  weight_pre: number;
  weight_post?: number;
  start_time: string;
  duration_minutes: number;
}

const specialtyService = {
  // Oncology Endpoints
  getChemoSchedule: async (): Promise<ChemoSession[]> => {
    try {
      const response = await client.get('/specialty/oncology/schedule');
      return response.data.data || [];
    } catch (error) {
      console.warn('Mocking Chemo Schedule due to API error/missing endpoint');
      // Mock Data for Prototype
      return [
          {
              id: 'c1', patient_id: 'p101', patient_name: 'Rajesh Kumar', 
              cycle_number: 3, protocol_name: 'R-CHOP', drug_name: 'Rituximab', 
              dosage: '375mg/m2', status: 'In Progress', start_time: '2025-05-10T09:00:00Z', notes: 'Monitor BP every 15m'
          },
          {
              id: 'c2', patient_id: 'p102', patient_name: 'Sarah Khan', 
              cycle_number: 1, protocol_name: 'AC-T', drug_name: 'Doxorubicin', 
              dosage: '60mg/m2', status: 'Scheduled', start_time: '2025-05-10T11:00:00Z'
          }
      ];
    }
  },

  submitChemoVitals: async (sessionId: string, vitals: any) => {
      // await client.post(`/specialty/oncology/session/${sessionId}/vitals`, vitals);
      return true;
  },

  // Dialysis Endpoints
  getDialysisSessions: async (): Promise<DialysisSession[]> => {
    try {
      const response = await client.get('/specialty/dialysis/sessions');
      return response.data.data || [];
    } catch (error) {
        console.warn('Mocking Dialysis Sessions');
        return [
            {
                id: 'd1', patient_id: 'p201', patient_name: 'Amit Patel', machine_id: 'D-04',
                status: 'Active', bp_start: '140/90', weight_pre: 75.5, start_time: '2025-05-10T08:30:00Z',
                duration_minutes: 240
            },
            {
                id: 'd2', patient_id: 'p205', patient_name: 'John Doe', machine_id: 'D-01',
                status: 'Pre-Check', bp_start: '-', weight_pre: 0, start_time: '2025-05-10T10:00:00Z',
                duration_minutes: 240
            }
        ];
    }
  },

  logDialysisReading: async (sessionId: string, reading: any) => {
      // await client.post(`/specialty/dialysis/session/${sessionId}/log`, reading);
      return true;
  }
};

export default specialtyService;
