package com.zeeshapps.actorempire;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StartupRecovery")
public class StartupRecoveryPlugin extends Plugin {
    @PluginMethod
    public void checkpoint(PluginCall call) {
        if (!(getActivity() instanceof MainActivity)) {
            call.resolve();
            return;
        }

        String checkpoint = call.getString("checkpoint", "");
        String failedTask = call.getString("failedTask", "");
        String failureCode = call.getString("failureCode", "");
        ((MainActivity) getActivity()).onJavaScriptStartupCheckpoint(
            checkpoint,
            failedTask,
            failureCode
        );
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        if (!(getActivity() instanceof MainActivity)) {
            JSObject unavailable = new JSObject();
            unavailable.put("available", false);
            call.resolve(unavailable);
            return;
        }
        call.resolve(((MainActivity) getActivity()).getStartupRecoveryState());
    }
}
