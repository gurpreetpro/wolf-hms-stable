import client from '../api/client';

export interface Vital {
  id: string;
  admission_id: string;
  patient_id: string;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  pulse_rate: number;
  temperature: number;
  spo2: number;
  respiratory_rate: number;
  weight?: number;
  blood_sugar?: number;
  notes?: string;
  recorded_by?: string;
  recorded_at: string;
}

export interface VitalInput {
  admission_id: string;
  patient_id: string;
  bp_systolic: number;
  bp_diastolic: number;
  pulse: number;
  temp: number;
  spo2: number;
  resp_rate?: number;
  weight?: number;
  blood_sugar?: number;
  notes?: string;
}

const vitalsService = {
  // Record new vitals
  recordVitals: async (data: VitalInput): Promise<Vital> => {
    try {
      const response = await client.post('/ward/vitals', {
        admission_id: data.admission_id,
        patient_id: data.patient_id,
        bp: `${data.bp_systolic}/${data.bp_diastolic}`,
        heart_rate: data.pulse.toString(),
        temp: data.temp.toString(),
        spo2: data.spo2.toString(),
        resp_rate: data.resp_rate?.toString(),
        weight: data.weight?.toString(),
        blood_sugar: data.blood_sugar?.toString(),
        notes: data.notes,
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('VitalsService.recordVitals Error', error);
      throw error;
    }
  },

  // Get vitals history for an admission
  getVitalsHistory: async (admissionId: string): Promise<Vital[]> => {
    try {
      const response = await client.get(`/ward/vitals/${admissionId}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('VitalsService.getVitalsHistory Error', error);
      return [];
    }
  },

  // Get latest vitals for an admission
  getLatestVitals: async (admissionId: string): Promise<Vital | null> => {
    try {
      const history = await vitalsService.getVitalsHistory(admissionId);
      return history.length > 0 ? history[0] : null;
    } catch (error) {
      console.error('VitalsService.getLatestVitals Error', error);
      return null;
    }
  },

  // Get ward-wide vitals summary
  getWardVitalsSummary: async (): Promise<{ critical: number; normal: number; pending: number }> => {
    try {
      const response = await client.get('/nurse/ward-overview');
      const data = response.data.data || response.data;
      return {
        critical: data.critical_patients || 0,
        normal: data.occupied_beds - (data.critical_patients || 0),
        pending: data.ui_alerts?.filter((a: any) => a.type === 'vitals')?.length || 0,
      };
    } catch (error) {
      console.error('VitalsService.getWardVitalsSummary Error', error);
      return { critical: 0, normal: 0, pending: 0 };
    }
  },

  // Check if vitals are abnormal
  isAbnormal: (vital: Vital): { abnormal: boolean; alerts: string[] } => {
    const alerts: string[] = [];
    
    if (vital.blood_pressure_systolic > 140 || vital.blood_pressure_systolic < 90) {
      alerts.push('BP abnormal');
    }
    if (vital.pulse_rate > 100 || vital.pulse_rate < 60) {
      alerts.push('Pulse abnormal');
    }
    if (vital.temperature > 38 || vital.temperature < 36) {
      alerts.push('Temp abnormal');
    }
    if (vital.spo2 < 95) {
      alerts.push('Low SpO2');
    }
    if (vital.respiratory_rate && (vital.respiratory_rate > 20 || vital.respiratory_rate < 12)) {
      alerts.push('RR abnormal');
    }
    
    return { abnormal: alerts.length > 0, alerts };
  },
};

export default vitalsService;
