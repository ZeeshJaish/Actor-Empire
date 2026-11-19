import { Capacitor, registerPlugin } from '@capacitor/core';

/* Phase 1 of the week-speed plan (2026-11-17), the native build (plan item 6): the game's own small native plugin
   (ios/App/CapApp-SPM/Sources/CapApp-SPM/AeNativeSupportPlugin.swift, android/.../AeNativeSupportPlugin.java).
   - withNativeBackgroundTask: on iOS a save runs inside a native background task, so leaving the app mid-save does
     not suspend the write. Elsewhere it simply runs the save.
   - getNativeDeviceInfo: the phone model and total memory, for kill reports. */

interface AeNativeSupport {
    beginBackgroundTask(): Promise<{ id: number }>;
    endBackgroundTask(options: { id: number }): Promise<void>;
    deviceInfo(): Promise<{ model: string; totalMemBytes: number }>;
}

const native = registerPlugin<AeNativeSupport>('AeNativeSupport');

const within = <T,>(promise: Promise<T>, ms: number): Promise<T | null> => new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(null); });
});

export const withNativeBackgroundTask = async <T,>(work: () => Promise<T>): Promise<T> => {
    if (Capacitor.getPlatform() !== 'ios') return work();
    // A begin that does not answer quickly never holds the save up.
    const begun = await within(native.beginBackgroundTask(), 400);
    try {
        return await work();
    } finally {
        if (begun && begun.id) void native.endBackgroundTask({ id: begun.id }).catch(() => { /* iOS ends it itself */ });
    }
};

let deviceInfo: Promise<{ model: string; totalMemGb: number } | null> | null = null;
export const getNativeDeviceInfo = (): Promise<{ model: string; totalMemGb: number } | null> => {
    if (!Capacitor.isNativePlatform()) return Promise.resolve(null);
    deviceInfo ||= within(native.deviceInfo(), 2000).then(info => info && typeof info.model === 'string'
        ? { model: info.model.slice(0, 40), totalMemGb: Math.round((Number(info.totalMemBytes) || 0) / 107_374_182.4) / 10 }
        : null);
    return deviceInfo;
};
