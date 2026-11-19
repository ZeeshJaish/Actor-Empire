package com.zeeshapps.actorempire;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* Phase 1 of the week-speed plan (2026-11-17), the native build (plan item 6), Android side:
   - deviceInfo: the phone's maker and model and its total memory (ActivityManager), for the kill reports the Week Ahead
     gate (phone model x career size) is calibrated from. The WebView's navigator.deviceMemory is rounded and capped
     at 8, so 4 there means anything from 4 to 7.9 GB.
   - beginBackgroundTask / endBackgroundTask: the same calls as on iOS, which needs them around saves; nothing to do
     on Android. */
@CapacitorPlugin(name = "AeNativeSupport")
public class AeNativeSupportPlugin extends Plugin {
    @PluginMethod
    public void deviceInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("model", (Build.MANUFACTURER + " " + Build.MODEL).trim());
        long totalMem = 0;
        try {
            ActivityManager manager = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
            if (manager != null) {
                ActivityManager.MemoryInfo info = new ActivityManager.MemoryInfo();
                manager.getMemoryInfo(info);
                totalMem = info.totalMem;
            }
        } catch (Exception ignored) {
            // optional
        }
        result.put("totalMemBytes", totalMem);
        call.resolve(result);
    }

    @PluginMethod
    public void beginBackgroundTask(PluginCall call) {
        JSObject result = new JSObject();
        result.put("id", 0);
        call.resolve(result);
    }

    @PluginMethod
    public void endBackgroundTask(PluginCall call) {
        call.resolve();
    }
}
