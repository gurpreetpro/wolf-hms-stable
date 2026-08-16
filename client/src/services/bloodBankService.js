/**
 * Blood Bank Client Service
 * WOLF HMS — BCMA Bedside Transfusion Verification (Phase 11)
 */

import axiosInstance from '../utils/axiosInstance';

const bloodBankService = {
  /**
   * Bedside Transfusion Verification — BCMA for Blood Products
   *
   * Dual-barcode scan: Patient wristband (UHID) + Blood unit ISBT DIN
   * WOLF Ultimate Guardrails check ABO/Rh mismatch, TTI, expiry, and cross-match.
   *
   * @param {object} params
   * @param {string} params.patientUhid — scanned patient wristband UHID
   * @param {string} params.isbtDinScanned — scanned blood unit ISBT DIN barcode
   * @param {object} [params.options] — { wardId, bedNumber, rateMlPerHour, vitalsBaseline }
   * @returns {Promise<{ success: boolean, data: object }>}
   */
  bedsideStartTransfusion: async (params) => {
    try {
      const response = await axiosInstance.post('/blood-bank/bedside/start-transfusion', {
        patientUhid: params.patientUhid,
        isbtDinScanned: params.isbtDinScanned,
        wardId: params.options?.wardId,
        bedNumber: params.options?.bedNumber,
        rateMlPerHour: params.options?.rateMlPerHour || 100,
        vitalsBaseline: params.options?.vitalsBaseline || {},
      });

      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (err) {
      // Return structured error from backend guardrails
      const responseData = err.response?.data;
      return {
        success: false,
        blocked: responseData?.blocked || true,
        status: responseData?.status || 'ERROR',
        message: responseData?.message || 'Bedside transfusion verification failed.',
        data: responseData?.data || null,
      };
    }
  },
};

export default bloodBankService;