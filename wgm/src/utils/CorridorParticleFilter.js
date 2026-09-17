/**
 * CorridorParticleFilter.js
 * 
 * 200-Particle Monte Carlo filter for indoor guard tracking.
 * Constrains PDR (pedestrian dead reckoning) to the hospital's
 * walkable corridor graph, preventing wall-through drift.
 */

const NUM_PARTICLES = 150;
const DEFAULT_CORRIDOR_WIDTH = 3.0; // meters (average hospital corridor width)
const R_EARTH = 6378137; // meters

// Helper: convert (lat, lng) delta to local meters (x=East, y=North)
function latLngToMeters(lat, lng, refLat, refLng) {
    const dLat = (lat - refLat) * Math.PI / 180;
    const dLng = (lng - refLng) * Math.PI / 180;
    const y = dLat * R_EARTH;
    const x = dLng * R_EARTH * Math.cos(refLat * Math.PI / 180);
    return { x, y };
}

// Helper: convert local meters back to (lat, lng)
function metersToLatLng(x, y, refLat, refLng) {
    const dLat = (y / R_EARTH) * 180 / Math.PI;
    const dLng = (x / (R_EARTH * Math.cos(refLat * Math.PI / 180))) * 180 / Math.PI;
    return {
        lat: refLat + dLat,
        lng: refLng + dLng
    };
}

// Helper: distance from point P to line segment AB in meters
function distPointToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
        const dpx = px - ax;
        const dpy = py - ay;
        return Math.sqrt(dpx * dpx + dpy * dpy);
    }

    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = ax + t * dx;
    const projY = ay + t * dy;
    const dX = px - projX;
    const dY = py - projY;
    return Math.sqrt(dX * dX + dY * dY);
}

class CorridorParticleFilter {
    constructor() {
        this.particles = [];
        this.segments = []; // Array of { ax, ay, bx, by } in meters relative to refAnchor
        this.refAnchor = null; // { lat, lng }
        this.isInitialized = false;
        this.corridorWidth = DEFAULT_CORRIDOR_WIDTH;
    }

    /**
     * Load walkable corridor graph from floor plan
     * @param {object} walkableGraph - { nodes: [{id, lat, lng}], edges: [{from, to}] }
     */
    setGraph(walkableGraph) {
        if (!walkableGraph || !walkableGraph.nodes || walkableGraph.nodes.length === 0) {
            this.segments = [];
            return;
        }

        // Set reference anchor to first node
        const firstNode = walkableGraph.nodes[0];
        this.refAnchor = { lat: firstNode.lat, lng: firstNode.lng };

        const nodeMap = new Map();
        for (const n of walkableGraph.nodes) {
            const m = latLngToMeters(n.lat, n.lng, this.refAnchor.lat, this.refAnchor.lng);
            nodeMap.set(n.id, m);
        }

        this.segments = [];
        if (walkableGraph.edges) {
            for (const e of walkableGraph.edges) {
                const a = nodeMap.get(e.from);
                const b = nodeMap.get(e.to);
                if (a && b) {
                    this.segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
                }
            }
        }

        console.log(`[ParticleFilter] Loaded ${walkableGraph.nodes.length} nodes, ${this.segments.length} corridor segments`);
    }

    /**
     * Initialize / Anchor particles at known seed coordinates
     * @param {number} lat 
     * @param {number} lng 
     * @param {number} sigmaMeters - initial dispersion (default 2m)
     */
    init(lat, lng, sigmaMeters = 2.0) {
        if (!lat || !lng) return;

        if (!this.refAnchor) {
            this.refAnchor = { lat, lng };
        }

        const center = latLngToMeters(lat, lng, this.refAnchor.lat, this.refAnchor.lng);
        this.particles = [];

        for (let i = 0; i < NUM_PARTICLES; i++) {
            // Gaussian jitter around center
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
            const z1 = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.sin(2.0 * Math.PI * u2);

            this.particles.push({
                x: center.x + z0 * sigmaMeters,
                y: center.y + z1 * sigmaMeters,
                weight: 1.0 / NUM_PARTICLES
            });
        }

        this.isInitialized = true;
    }

    /**
     * Propagate particles on each step (PDR motion model)
     * @param {number} stepLength - meters
     * @param {number} headingDeg - degrees from North
     */
    predict(stepLength, headingDeg) {
        if (!this.isInitialized || this.particles.length === 0) return;

        const theta = (headingDeg * Math.PI) / 180;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Add slight step noise (~10%) and heading noise (~5 deg)
            const noisyStep = stepLength * (1.0 + (Math.random() - 0.5) * 0.2);
            const noisyTheta = theta + ((Math.random() - 0.5) * 10 * Math.PI / 180);

            // Polar to Cartesian (y = North, x = East)
            const dx = noisyStep * Math.sin(noisyTheta);
            const dy = noisyStep * Math.cos(noisyTheta);

            p.x += dx;
            p.y += dy;
        }
    }

    /**
     * Compute distance from particle (x,y) to nearest corridor segment
     */
    getDistToCorridor(x, y) {
        if (this.segments.length === 0) return 0; // No corridors defined, open space

        let minDist = Infinity;
        for (let i = 0; i < this.segments.length; i++) {
            const s = this.segments[i];
            const d = distPointToSegment(x, y, s.ax, s.ay, s.bx, s.by);
            if (d < minDist) {
                minDist = d;
            }
        }
        return minDist;
    }

    /**
     * Measurement update & Resampling
     * Penalizes particles outside corridors and resamples based on likelihood
     * @param {object} gpsFix - Optional { latitude, longitude, accuracy }
     * @returns {object} - { lat, lng, confidenceMeters }
     */
    updateAndResample(gpsFix = null) {
        if (!this.isInitialized || this.particles.length === 0) return null;

        let totalWeight = 0;
        const halfWidth = this.corridorWidth / 2;

        let gpsMeters = null;
        if (gpsFix && gpsFix.latitude && gpsFix.longitude && gpsFix.accuracy && gpsFix.accuracy < 25) {
            gpsMeters = latLngToMeters(gpsFix.latitude, gpsFix.longitude, this.refAnchor.lat, this.refAnchor.lng);
        }

        // 1. Weight Evaluation
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            let weight = 1.0;

            // Map-matching corridor weight
            if (this.segments.length > 0) {
                const dist = this.getDistToCorridor(p.x, p.y);
                if (dist <= halfWidth) {
                    weight = 1.0;
                } else {
                    // Exponential decay outside corridor
                    const excess = dist - halfWidth;
                    weight = Math.exp(-0.5 * Math.pow(excess / 1.5, 2));
                }
            }

            // GPS likelihood weight if available
            if (gpsMeters) {
                const dGps = Math.hypot(p.x - gpsMeters.x, p.y - gpsMeters.y);
                const sigma = Math.max(3, gpsFix.accuracy);
                const gpsWeight = Math.exp(-0.5 * Math.pow(dGps / sigma, 2));
                weight *= (0.3 + 0.7 * gpsWeight);
            }

            p.weight = Math.max(weight, 1e-6);
            totalWeight += p.weight;
        }

        // 2. Normalize Weights & Compute Weighted Centroid
        let meanX = 0;
        let meanY = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.weight /= totalWeight;
            meanX += p.x * p.weight;
            meanY += p.y * p.weight;
        }

        // 3. Compute Particle Variance (Confidence)
        let variance = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            variance += p.weight * (Math.pow(p.x - meanX, 2) + Math.pow(p.y - meanY, 2));
        }
        const confidenceMeters = Math.min(Math.max(Math.sqrt(variance), 1.5), 15);

        // 4. Low-Variance Resampling (O(N))
        const newParticles = [];
        const r = Math.random() / NUM_PARTICLES;
        let c = this.particles[0].weight;
        let idx = 0;

        for (let m = 0; m < NUM_PARTICLES; m++) {
            const u = r + m / NUM_PARTICLES;
            while (u > c && idx < NUM_PARTICLES - 1) {
                idx++;
                c += this.particles[idx].weight;
            }
            // Add slight jitter to resampled particles to prevent particle depletion
            const jitter = 0.2;
            newParticles.push({
                x: this.particles[idx].x + (Math.random() - 0.5) * jitter,
                y: this.particles[idx].y + (Math.random() - 0.5) * jitter,
                weight: 1.0 / NUM_PARTICLES
            });
        }
        this.particles = newParticles;

        // Convert centroid back to Lat/Lng
        const resultLatLng = metersToLatLng(meanX, meanY, this.refAnchor.lat, this.refAnchor.lng);

        return {
            lat: resultLatLng.lat,
            lng: resultLatLng.lng,
            confidenceMeters: parseFloat(confidenceMeters.toFixed(1))
        };
    }
}

export default new CorridorParticleFilter();
