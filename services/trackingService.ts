import { registerPlugin } from '@capacitor/core';

type TrackingStatus = 'authorized' | 'denied' | 'restricted' | 'notDetermined' | 'unknown';

interface TrackingPermissionPlugin {
    getStatus(): Promise<{ status?: TrackingStatus }>;
    requestPermission(): Promise<{ status?: TrackingStatus }>;
}

const TrackingPermission = registerPlugin<TrackingPermissionPlugin>('TrackingPermission');

const isCapacitorIOS = () =>
    window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'ios';

export const ensureTrackingPermission = async (): Promise<TrackingStatus | 'unsupported'> => {
    if (!isCapacitorIOS()) return 'unsupported';

    try {
        const current = await TrackingPermission.getStatus();
        const status = current?.status || 'unknown';
        if (status !== 'notDetermined') {
            return status;
        }

        const requested = await TrackingPermission.requestPermission();
        return requested?.status || 'unknown';
    } catch (error) {
        console.error('Tracking permission request failed:', error);
        return 'unknown';
    }
};
