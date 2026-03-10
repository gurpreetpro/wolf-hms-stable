/**
 * Accessibility Helpers — VoiceOver and TalkBack support utilities
 * Provides consistent accessibility props for common UI patterns.
 */

/**
 * Create accessibility props for an interactive card/button
 */
export function accessibleButton(label: string, hint?: string) {
  return {
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

/**
 * Create accessibility props for a header/title
 */
export function accessibleHeader(label: string) {
  return {
    accessible: true,
    accessibilityRole: 'header' as const,
    accessibilityLabel: label,
  };
}

/**
 * Create accessibility props for a text element
 */
export function accessibleText(label: string) {
  return {
    accessible: true,
    accessibilityRole: 'text' as const,
    accessibilityLabel: label,
  };
}

/**
 * Create accessibility props for an image
 */
export function accessibleImage(label: string) {
  return {
    accessible: true,
    accessibilityRole: 'image' as const,
    accessibilityLabel: label,
  };
}

/**
 * Create accessibility props for a tab button
 */
export function accessibleTab(label: string, selected: boolean, tabIndex: number, totalTabs: number) {
  return {
    accessible: true,
    accessibilityRole: 'tab' as const,
    accessibilityLabel: label,
    accessibilityState: { selected },
    accessibilityHint: `Tab ${tabIndex + 1} of ${totalTabs}`,
  };
}

/**
 * Create accessibility props for a toggle/switch
 */
export function accessibleSwitch(label: string, checked: boolean) {
  return {
    accessible: true,
    accessibilityRole: 'switch' as const,
    accessibilityLabel: label,
    accessibilityState: { checked },
  };
}

/**
 * Create accessibility props for a progress bar
 */
export function accessibleProgress(label: string, value: number, max: number) {
  return {
    accessible: true,
    accessibilityRole: 'progressbar' as const,
    accessibilityLabel: label,
    accessibilityValue: { min: 0, max, now: value, text: `${Math.round((value / max) * 100)}%` },
  };
}

/**
 * Screen reader announcement
 */
export function announceForAccessibility(message: string) {
  // React Native doesn't have a built-in announce API
  // This is a placeholder for expo-speech or AccessibilityInfo.announceForAccessibility
  try {
    const { AccessibilityInfo } = require('react-native');
    AccessibilityInfo.announceForAccessibility(message);
  } catch {
    // Silent fail on unsupported platforms
  }
}
