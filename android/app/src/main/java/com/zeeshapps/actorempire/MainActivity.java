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
        if (level < ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW || bridge == null || bridge.getWebView() == null) return;
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('actor-empire-memory-warning', { detail: { platform: 'android', level: " + level + " } }))",
            null
        ));
    }
}
