import client from '../api/client';

export interface Staff {
  id: string;
  name: string;
  role: string;
  department?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'on_leave' | 'off_duty';
  shift?: string;
  assigned_ward_id?: string;
  assigned_ward_name?: string;
}

export interface ShiftSchedule {
  id: string;
  staff_id: string;
  staff_name?: string;
  ward_id: string;
  ward_name?: string;
  shift: 'morning' | 'afternoon' | 'night';
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'on_duty' | 'completed' | 'absent';
}

export interface AssignShiftInput {
  staff_id: string;
  ward_id: string;
  shift: 'morning' | 'afternoon' | 'night';
  date: string;
  bed_ids?: string[];
}

const rosterService = {
  // Get staff on duty for a ward
  getStaffOnDuty: async (wardId?: string): Promise<Staff[]> => {
    try {
      let url = '/ward/staff?status=active';
      if (wardId) url += `&ward_id=${wardId}`;
      const response = await client.get(url);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('RosterService.getStaffOnDuty Error', error);
      return [];
    }
  },

  // Get all nurses
  getAllNurses: async (): Promise<Staff[]> => {
    try {
      const response = await client.get('/admin/users?role=nurse');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('RosterService.getAllNurses Error', error);
      return [];
    }
  },

  // Get shift roster for a date range
  getShiftRoster: async (wardId: string, startDate: string, endDate?: string): Promise<ShiftSchedule[]> => {
    try {
      let url = `/ward/roster?ward_id=${wardId}&start=${startDate}`;
      if (endDate) url += `&end=${endDate}`;
      const response = await client.get(url);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('RosterService.getShiftRoster Error', error);
      return [];
    }
  },

  // Assign nurse to shift
  assignShift: async (data: AssignShiftInput): Promise<ShiftSchedule> => {
    try {
      const response = await client.post('/ward/roster/assign', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('RosterService.assignShift Error', error);
      throw error;
    }
  },

  // Remove shift assignment
  removeShift: async (shiftId: string): Promise<void> => {
    try {
      await client.delete(`/ward/roster/${shiftId}`);
    } catch (error) {
      console.error('RosterService.removeShift Error', error);
      throw error;
    }
  },

  // Get current shift info
  getCurrentShift: (): { name: string; start: string; end: string } => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) {
      return { name: 'Morning Shift', start: '06:00', end: '14:00' };
    } else if (hour >= 14 && hour < 22) {
      return { name: 'Afternoon Shift', start: '14:00', end: '22:00' };
    } else {
      return { name: 'Night Shift', start: '22:00', end: '06:00' };
    }
  },

  // Mark attendance
  markAttendance: async (staffId: string, status: 'present' | 'absent' | 'late'): Promise<void> => {
    try {
      await client.post('/ward/attendance', { staff_id: staffId, status });
    } catch (error) {
      console.error('RosterService.markAttendance Error', error);
      throw error;
    }
  },
};

export default rosterService;
