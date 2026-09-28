package com.zedfury.layoutqa;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
    private static final String TAG = "ActorEmpireLayoutQA";
    private static final String FIXTURE_URL = "http://10.0.2.2:5178/scripts/fixtures/responsive-layout-qa.html";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView webView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                readFixtureStatus(0);
            }
        });
        setContentView(webView);
        webView.loadUrl(FIXTURE_URL);
    }

    private void readFixtureStatus(int attempt) {
        if (webView == null) return;
        webView.evaluateJavascript("(function(){var n=document.getElementById('native-layout-status');return n?n.dataset.result+' | '+n.textContent:'pending';})()", value -> {
            if (value.contains("pass |") || value.contains("fail |")) {
                Log.i(TAG, value);
            } else if (attempt < 50) {
                handler.postDelayed(() -> readFixtureStatus(attempt + 1), 200);
            } else {
                Log.e(TAG, "Layout fixture did not report within 10 seconds: " + value);
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
