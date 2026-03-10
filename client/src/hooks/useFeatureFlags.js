/**
 * useFeatureFlags Hook
 * [TITAN] Provides feature flag state to components
 * 
 * Usage:
 *   const { features, isEnabled, loading } = useFeatureFlags();
 *   if (isEnabled('bloodBank')) { ... }
 */

import { useState, useEffect, useCallback } from 'react';
import adminService from '../services/adminService';

export const useFeatureFlags = (autoFetch = true) => {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getFeatures();
      const data = response.success ? response.data : response;
      setFeatures(data.features || data || {});
    } catch (err) {
      setError(err.message);
      // Set defaults on error
      setFeatures({
        opd: true,
        ipd: true,
        billing: true,
        pharmacy: true,
        lab: true
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchFeatures();
    }
  }, [autoFetch, fetchFeatures]);

  /**
   * Check if a feature is enabled
   * @param {string} featureName - Feature key to check
   * @returns {boolean} True if enabled
   */
  const isEnabled = useCallback((featureName) => {
    return features[featureName] === true;
  }, [features]);

  /**
   * Check multiple features at once
   * @param {string[]} featureNames - Array of feature keys
   * @returns {boolean} True if ALL features are enabled
   */
  const allEnabled = useCallback((featureNames) => {
    return featureNames.every(name => features[name] === true);
  }, [features]);

  /**
   * Check if any of the features are enabled
   * @param {string[]} featureNames - Array of feature keys
   * @returns {boolean} True if ANY feature is enabled
   */
  const anyEnabled = useCallback((featureNames) => {
    return featureNames.some(name => features[name] === true);
  }, [features]);

  return {
    features,
    loading,
    error,
    isEnabled,
    allEnabled,
    anyEnabled,
    refetch: fetchFeatures
  };
};

export default useFeatureFlags;
