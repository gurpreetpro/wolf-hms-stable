import client from '../api/client';

const wardService = {
  getWards: async () => {
    try {
      const response = await client.get('/ward');
      return response.data.data || response.data;
    } catch (error) {
      console.error('WardService.getWards Error', error);
      throw error;
    }
  },

  getConsumables: async () => {
    try {
      const response = await client.get('/ward/consumables');
      return response.data.data || response.data;
    } catch (error) {
      console.error('WardService.getConsumables Error', error);
      throw error;
    }
  },

  getRequests: async () => {
      try {
        const response = await client.get('/ward/requests');
        return response.data.data || response.data;
      } catch (error) {
        console.error('WardService.getRequests Error', error);
        throw error;
      }
  },
  
  getMyAssignments: async () => {
    try {
        const response = await client.get('/ward/my-assignments');
        return response.data.data || response.data;
    } catch (error) {
        console.error('WardService.getMyAssignments Error', error);
        throw error;
    }
  },

  resolveRequest: async (id: string) => {
      try {
          const response = await client.patch(`/ward/requests/${id}`, { status: 'resolved' });
          return response.data;
      } catch (error) {
          console.error('WardService.resolveRequest Error', error);
          throw error;
      }
  },

  getStaffOnDuty: async () => {
      try {
          // Endpoint to get staff currently assigned/active in the ward
          const response = await client.get('/ward/staff');
          return response.data.data || response.data;
      } catch (error) {
          console.error('WardService.getStaffOnDuty Error', error);
          throw error;
      }
  }
};

export default wardService;
