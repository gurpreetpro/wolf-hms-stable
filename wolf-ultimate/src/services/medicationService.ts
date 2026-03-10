import client from '../api/client';

export interface MedicationTask {
  id: string;
  admission_id: string;
  patient_id: string;
  patient_name: string;
  bed_number?: string;
  medication_name: string;
  dosage: string;
  route: string;
  frequency: string;
  scheduled_time: string;
  status: 'pending' | 'due' | 'overdue' | 'given' | 'skipped' | 'held';
  notes?: string;
  is_prn?: boolean;
}

export interface AdministerInput {
  task_id: string;
  administered_at?: string;
  notes?: string;
  given_by?: string;
}

const medicationService = {
  // Get pending medication tasks for the ward
  getPendingTasks: async (): Promise<MedicationTask[]> => {
    try {
      const response = await client.get('/nurse/medication-tasks');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('MedicationService.getPendingTasks Error', error);
      return [];
    }
  },

  // Get medication tasks for a specific patient/admission
  getPatientMedications: async (admissionId: string): Promise<MedicationTask[]> => {
    try {
      const response = await client.get(`/nurse/medication-tasks?admission_id=${admissionId}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('MedicationService.getPatientMedications Error', error);
      return [];
    }
  },

  // Mark medication as administered
  administerMedication: async (data: AdministerInput): Promise<MedicationTask> => {
    try {
      const response = await client.post('/nurse/administer', {
        task_id: data.task_id,
        administered_at: data.administered_at || new Date().toISOString(),
        notes: data.notes,
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('MedicationService.administerMedication Error', error);
      throw error;
    }
  },

  // Skip medication with reason
  skipMedication: async (taskId: string, reason: string): Promise<MedicationTask> => {
    try {
      const response = await client.post('/nurse/medication-action', {
        task_id: taskId,
        action: 'skip',
        reason,
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('MedicationService.skipMedication Error', error);
      throw error;
    }
  },

  // Hold medication
  holdMedication: async (taskId: string, reason: string): Promise<MedicationTask> => {
    try {
      const response = await client.post('/nurse/medication-action', {
        task_id: taskId,
        action: 'hold',
        reason,
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('MedicationService.holdMedication Error', error);
      throw error;
    }
  },

  // Get medication administration history (eMAR)
  getAdministrationHistory: async (admissionId: string): Promise<any[]> => {
    try {
      const response = await client.get(`/nurse/emar-history?admission_id=${admissionId}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('MedicationService.getAdministrationHistory Error', error);
      return [];
    }
  },

  // Get due/overdue counts for badge display
  getDueCounts: (tasks: MedicationTask[]): { due: number; overdue: number } => {
    const now = new Date();
    let due = 0;
    let overdue = 0;

    tasks.forEach((task) => {
      if (task.status === 'pending' || task.status === 'due') {
        const scheduledTime = new Date(task.scheduled_time);
        const diffMinutes = (now.getTime() - scheduledTime.getTime()) / 60000;
        
        if (diffMinutes > 30) {
          overdue++;
        } else if (diffMinutes >= -15) {
          due++;
        }
      }
    });

    return { due, overdue };
  },
};

export default medicationService;
