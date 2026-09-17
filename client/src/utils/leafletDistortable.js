import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') {
    window.L = L;
}

// 1. leaflet-toolbar attaches L.Toolbar2 to L (required by leaflet-distortableimage)
import 'leaflet-toolbar';
import 'leaflet-toolbar/dist/leaflet.toolbar.css';

// 2. leaflet-distortableimage attaches L.distortableImageOverlay using L.Toolbar2
import 'leaflet-distortableimage';
import 'leaflet-distortableimage/dist/leaflet.distortableimage.css';

export default L;
