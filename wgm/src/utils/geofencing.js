
/**
 * Wolf Guard Geofencing Utility
 * Implements Ray Casting algorithm for Point-In-Polygon detection.
 * Used for client-side Zone Awareness.
 */

/**
 * Check if a point is inside a polygon
 * @param {object} point - { latitude, longitude }
 * @param {array} polygonCoords - Array of [lat, lng] arrays
 * @returns {boolean} true if inside
 */
export const isPointInPolygon = (point, polygonCoords) => {
    if (!point || !polygonCoords || polygonCoords.length < 3) return false;

    const x = point.latitude;
    const y = point.longitude;
    
    let inside = false;
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
        const xi = polygonCoords[i][0], yi = polygonCoords[i][1];
        const xj = polygonCoords[j][0], yj = polygonCoords[j][1];
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            
        if (intersect) inside = !inside;
    }
    
    return inside;
};

/**
 * Find which zone a point belongs to
 * @param {object} point - { latitude, longitude }
 * @param {array} zones - Array of Zone objects { name, coordinates }
 * @returns {string} Name of the zone or 'Unknown'
 */
export const determineZone = (point, zones) => {
    if (!zones || zones.length === 0) return 'Unknown';

    // Prioritize RESTRICTED zones first (security first!)
    const restrictedZones = zones.filter(z => z.zone_type === 'RESTRICTED');
    for (const zone of restrictedZones) {
        if (isPointInPolygon(point, zone.coordinates)) {
            return `${zone.name} (RESTRICTED)`;
        }
    }

    // Then check generic/safe zones
    const otherZones = zones.filter(z => z.zone_type !== 'RESTRICTED');
    for (const zone of otherZones) {
        if (isPointInPolygon(point, zone.coordinates)) {
            return zone.name;
        }
    }

    return 'Unknown';
};
