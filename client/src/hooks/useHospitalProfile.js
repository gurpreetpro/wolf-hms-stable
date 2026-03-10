import { useHospitalProfileContext } from '../contexts/HospitalProfileContext';

/**
 * Custom hook to access hospital profile data
 * Uses HospitalProfileContext for centralized caching
 * 
 * Returns:
 * - hospitalProfile: The hospital profile data object
 * - loading: Boolean indicating if data is being fetched
 * - error: Error message if fetch failed
 * - refreshProfile: Function to refresh cached data
 * - getFormattedAddress: Helper to get formatted address string
 * - getContactString: Helper to get contact info with emojis
 */
const useHospitalProfile = () => {
    return useHospitalProfileContext();
};

export default useHospitalProfile;

