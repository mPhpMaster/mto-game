import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from './platform';

export type MicPermissionState = 'granted' | 'denied' | 'prompt';

interface MicrophonePermissionPlugin {
  checkPermissions(): Promise<{ microphone?: MicPermissionState }>;
  requestPermissions(): Promise<{ microphone?: MicPermissionState }>;
  openSettings(): Promise<void>;
}

const MicrophonePermission = registerPlugin<MicrophonePermissionPlugin>('MicrophonePermission', {
  web: () => ({
    async checkPermissions() {
      return { microphone: 'granted' as const };
    },
    async requestPermissions() {
      return { microphone: 'granted' as const };
    },
    async openSettings() {
      /* browser uses its own site settings */
    },
  }),
});

/** Request Android/iOS mic permission before getUserMedia in the native shell. */
export async function ensureMicrophonePermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    const check = await MicrophonePermission.checkPermissions();
    if (check.microphone === 'granted') return true;
    const req = await MicrophonePermission.requestPermissions();
    return req.microphone === 'granted';
  } catch {
    return false;
  }
}

/** Opens the app settings screen so the user can enable the microphone. */
export async function openMicrophoneSettings(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await MicrophonePermission.openSettings();
  } catch {
    /* ignore — settings intent unavailable */
  }
}
