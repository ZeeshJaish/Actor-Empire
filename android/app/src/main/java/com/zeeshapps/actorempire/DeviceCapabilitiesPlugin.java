package com.zeeshapps.actorempire;

import android.app.ActivityManager;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.PowerManager;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeviceCapabilities")
public class DeviceCapabilitiesPlugin extends Plugin {
    private static final int SCHEMA_VERSION = 1;

    @PluginMethod
    public void getSnapshot(PluginCall call) {
        Context context = getContext();
        ActivityManager activityManager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager == null) {
            call.reject("Android activity manager is unavailable.");
            return;
        }

        ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
        activityManager.getMemoryInfo(memoryInfo);

        JSObject snapshot = new JSObject();
        snapshot.put("schemaVersion", SCHEMA_VERSION);
        snapshot.put("apiLevel", Build.VERSION.SDK_INT);
        snapshot.put("androidRelease", Build.VERSION.RELEASE == null ? "unknown" : Build.VERSION.RELEASE);
        snapshot.put("isLowRamDevice", activityManager.isLowRamDevice());
        snapshot.put("memoryClassMb", activityManager.getMemoryClass());
        snapshot.put("largeMemoryClassMb", activityManager.getLargeMemoryClass());
        snapshot.put("totalMemoryMb", DeviceCapabilityValues.bytesToMegabytes(memoryInfo.totalMem));
        snapshot.put("availableMemoryMb", DeviceCapabilityValues.bytesToMegabytes(memoryInfo.availMem));
        snapshot.put("lowMemory", memoryInfo.lowMemory);
        snapshot.put("memoryThresholdMb", DeviceCapabilityValues.bytesToMegabytes(memoryInfo.threshold));

        addThermalSnapshot(context, snapshot);
        addWebViewSnapshot(snapshot);
        call.resolve(snapshot);
    }

    private void addThermalSnapshot(Context context, JSObject snapshot) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (powerManager == null) return;

        try {
            snapshot.put("thermalStatus", powerManager.getCurrentThermalStatus());
        } catch (RuntimeException ignored) {
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;
        try {
            Double thermalHeadroom = DeviceCapabilityValues.sanitizeThermalHeadroom(
                powerManager.getThermalHeadroom(0)
            );
            if (thermalHeadroom != null) {
                snapshot.put("thermalHeadroom", thermalHeadroom);
            }
        } catch (RuntimeException ignored) {
            // Thermal headroom is optional and must never block game startup.
        }
    }

    private void addWebViewSnapshot(JSObject snapshot) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            PackageInfo packageInfo = WebView.getCurrentWebViewPackage();
            if (packageInfo != null && packageInfo.versionName != null) {
                snapshot.put("webViewVersion", packageInfo.versionName);
            }
        } catch (RuntimeException ignored) {
            // WebView version is diagnostic-only and may be hidden by some vendors.
        }
    }
}
