
import { useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

/**
 * Hook to detect "Rapid Volume Down x3" for SOS
 * @param {function} onTrigger - Callback when SOS is triggered
 */
export const useHardwareSOS = (onTrigger) => {
    const [clickCount, setClickCount] = useState(0);
    const lastClickTime = useRef(0);
    const lastVolume = useRef(0.5); // Assume starting mid-volume
    
    // Config
    const TIME_WINDOW = 2000; // 2 seconds to press 3 times
    const TRIGGER_COUNT = 3;

    useEffect(() => {
        let volumeListener = null;

        const init = async () => {
            // 1. Get initial volume
            try {
                const vol = await VolumeManager.getVolume();
                lastVolume.current = vol.volume;
            } catch (e) {
                console.warn("VolumeManager not available");
            }
            
            // 2. Add Listener
            volumeListener = VolumeManager.addVolumeListener((result) => {
                const currentVol = result.volume;
                const prevVol = lastVolume.current;
                const now = Date.now();

                // Logic: Volume went DOWN
                // Note: floating point comparison requires epsilon usually, but rough check is ok
                if (currentVol < prevVol) {
                    
                    // Check time window
                    if (now - lastClickTime.current > TIME_WINDOW) {
                        // Reset if too slow
                        setClickCount(1);
                    } else {
                        // Increment
                        setClickCount(prev => {
                            const newCount = prev + 1;
                            if (newCount >= TRIGGER_COUNT) {
                                onTrigger();
                                return 0; // Reset after trigger
                            }
                            return newCount;
                        });
                    }
                    lastClickTime.current = now;
                }

                // Update 'lastVolume' reference
                lastVolume.current = currentVol;
            });
        };

        init();

        return () => {
            if (volumeListener) volumeListener.remove();
        };
    }, [onTrigger]);

    // Debug helper (Optional)
    // console.log(`SOS Clicks: ${clickCount}`);
};
