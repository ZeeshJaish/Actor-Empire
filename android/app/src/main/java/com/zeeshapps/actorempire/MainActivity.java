package com.zeeshapps.actorempire;

import android.content.ComponentCallbacks2;
import android.os.Bundle;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidPurchasesPlugin.class);
        registerPlugin(AndroidSaveTransferPlugin.class);
        // Phase 1 (2026-11-17): device info for kill reports (AeNativeSupportPlugin.java).
        registerPlugin(AeNativeSupportPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void load() {
        super.load();
        if (bridge == null) return;
        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                webView.post(() -> recreate());
                return true;
            }
        });
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        /* Phase 1 (2026-11-17), week-speed plan Phase H item 6: 20 (UI_HIDDEN) comes every time the game leaves the
           screen, and 40 (BACKGROUND) once it sits in the background. Neither is memory pressure on the game, yet each
           started a full-career save and turned Week Ahead off for the session. Since Android 14 they are the only
           levels sent, so on those phones nothing is forwarded now. */
        if (level == ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN || level == ComponentCallbacks2.TRIM_MEMORY_BACKGROUND) return;
        if (level < ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW || bridge == null || bridge.getWebView() == null) return;
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('actor-empire-memory-warning', { detail: { platform: 'android', level: " + level + " } }))",
            null
        ));
    }
}
