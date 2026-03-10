import client from '../api/client';

// ═══════════════════════════════════════════════════════
//  DIET SERVICE — Meal Plans, Nutrition, Kitchen Orders
// ═══════════════════════════════════════════════════════

export interface DietPatient {
  id: number; name: string; uhid: string; age: number; gender: 'M' | 'F' | 'O';
  ward: string; bed: string; diagnosis: string;
  diet_type: 'REGULAR' | 'DIABETIC' | 'RENAL' | 'CARDIAC' | 'SOFT' | 'LIQUID' | 'NBM' | 'HIGH_PROTEIN';
  allergies: string[]; calorie_target: number;
  status: 'ACTIVE' | 'DISCHARGED' | 'NPO';
}

export interface MealPlan {
  id: number; patient_uhid: string; date: string;
  breakfast: MealItem[]; lunch: MealItem[]; dinner: MealItem[]; snacks: MealItem[];
  total_calories: number; total_protein: number; total_carbs: number; total_fat: number;
}

export interface MealItem {
  name: string; portion: string; calories: number; protein: number; carbs: number; fat: number;
}

export interface KitchenOrder {
  id: number; patient_name: string; patient_uhid: string; ward: string; bed: string;
  meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  diet_type: string; allergies: string[];
  items: string[]; special_instructions?: string;
  status: 'PENDING' | 'PREPARING' | 'DISPATCHED' | 'DELIVERED';
  scheduled_time: string;
}

export interface DietDashboardStats {
  active_patients: number; meals_today: number; meals_delivered: number;
  pending_orders: number; allergy_alerts: number; npo_patients: number;
}

const MOCK_DASHBOARD: DietDashboardStats = {
  active_patients: 24, meals_today: 72, meals_delivered: 48,
  pending_orders: 8, allergy_alerts: 3, npo_patients: 2,
};

const MOCK_PATIENTS: DietPatient[] = [
  { id: 1, name: 'Rakesh Kumar', uhid: 'UHID-5001', age: 52, gender: 'M', ward: 'Ortho-A', bed: 'B-12', diagnosis: 'Post TKR', diet_type: 'HIGH_PROTEIN', allergies: [], calorie_target: 2200, status: 'ACTIVE' },
  { id: 2, name: 'Anita Devi', uhid: 'UHID-5002', age: 38, gender: 'F', ward: 'Gen-B', bed: 'B-4', diagnosis: 'Cholecystectomy', diet_type: 'SOFT', allergies: ['Gluten'], calorie_target: 1600, status: 'ACTIVE' },
  { id: 3, name: 'Vijay Singh', uhid: 'UHID-5003', age: 64, gender: 'M', ward: 'Neuro-ICU', bed: 'N-2', diagnosis: 'Stroke', diet_type: 'LIQUID', allergies: [], calorie_target: 1400, status: 'ACTIVE' },
  { id: 4, name: 'Priya Nair', uhid: 'UHID-2004', age: 55, gender: 'F', ward: 'Card-B', bed: 'C-8', diagnosis: 'Post CABG', diet_type: 'CARDIAC', allergies: ['Shellfish', 'Nuts'], calorie_target: 1800, status: 'ACTIVE' },
  { id: 5, name: 'Sunil Verma', uhid: 'UHID-3001', age: 60, gender: 'M', ward: 'Med-A', bed: 'M-6', diagnosis: 'CKD Stage 4', diet_type: 'RENAL', allergies: [], calorie_target: 1600, status: 'ACTIVE' },
  { id: 6, name: 'Geeta Devi', uhid: 'UHID-4008', age: 48, gender: 'F', ward: 'Surg-A', bed: 'S-3', diagnosis: 'Pre-op Lap Chole', diet_type: 'NBM', allergies: ['Lactose'], calorie_target: 0, status: 'NPO' },
];

const MOCK_ORDERS: KitchenOrder[] = [
  { id: 1, patient_name: 'Rakesh Kumar', patient_uhid: 'UHID-5001', ward: 'Ortho-A', bed: 'B-12', meal_type: 'LUNCH', diet_type: 'HIGH_PROTEIN', allergies: [], items: ['Chicken Curry', 'Brown Rice', 'Dal', 'Paneer Bhurji', 'Curd'], scheduled_time: '12:30', status: 'PREPARING' },
  { id: 2, patient_name: 'Priya Nair', patient_uhid: 'UHID-2004', ward: 'Card-B', bed: 'C-8', meal_type: 'LUNCH', diet_type: 'CARDIAC', allergies: ['Shellfish', 'Nuts'], items: ['Steamed Fish', 'Oats Roti', 'Lauki Sabzi', 'Salad'], special_instructions: 'Low sodium, no oil frying', scheduled_time: '12:30', status: 'PENDING' },
  { id: 3, patient_name: 'Vijay Singh', patient_uhid: 'UHID-5003', ward: 'Neuro-ICU', bed: 'N-2', meal_type: 'LUNCH', diet_type: 'LIQUID', allergies: [], items: ['Vegetable Soup', 'Fruit Juice', 'Buttermilk'], scheduled_time: '12:00', status: 'DISPATCHED' },
  { id: 4, patient_name: 'Sunil Verma', patient_uhid: 'UHID-3001', ward: 'Med-A', bed: 'M-6', meal_type: 'LUNCH', diet_type: 'RENAL', allergies: [], items: ['Low-K Rice', 'Bottle Gourd', 'Apple', 'Egg White'], special_instructions: 'Low potassium, low phosphorus', scheduled_time: '12:30', status: 'PENDING' },
];

const dietService = {
  getDashboard: async (): Promise<DietDashboardStats> => {
    try { const r = await client.get('/dietary/dashboard'); return r.data.data || r.data; }
    catch { return MOCK_DASHBOARD; }
  },
  getPatients: async (): Promise<DietPatient[]> => {
    try { const r = await client.get('/dietary'); return r.data.data || r.data; }
    catch { return MOCK_PATIENTS; }
  },
  getKitchenOrders: async (): Promise<KitchenOrder[]> => {
    try { const r = await client.get('/dietary'); return r.data.data || r.data; }
    catch { return MOCK_ORDERS; }
  },
  createMealPlan: async (plan: Partial<MealPlan>): Promise<void> => {
    try { await client.post('/dietary/plans', plan); }
    catch (e) { console.error('Meal plan error:', e); throw e; }
  },
  getMealPlans: async (): Promise<MealPlan[]> => {
    try { const r = await client.get('/dietary/plans'); return r.data.data || r.data; }
    catch { return []; }
  },
  getAllergies: async (): Promise<{patient_id: number; allergen: string; severity: string}[]> => {
    try { const r = await client.get('/dietary/allergies'); return r.data.data || r.data; }
    catch { return []; }
  },
  logNutrition: async (data: {patient_id: number; meal_time: string; calories_consumed: number}): Promise<void> => {
    try { await client.post('/dietary/nutrition', data); }
    catch (e) { console.error('Nutrition log error:', e); throw e; }
  },
  updateOrderStatus: async (orderId: number, status: string): Promise<void> => {
    try { await client.put(`/dietary/${orderId}`, { status }); }
    catch (e) { console.error('Order status error:', e); throw e; }
  },
};

export default dietService;
