package com.zeeshapps.actorempire;

import android.app.ActivityManager;
import android.content.ComponentCallbacks2;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.view.ViewGroup;
import android.widget.Button;

import androidx.appcompat.app.AlertDialog;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "AEStartupRecovery";
    private static final String PREFS_NAME = "actor_empire_startup_recovery";
    private static final String KEY_STARTUP_IN_PROGRESS = "startup_in_progress";
    private static final String KEY_FAILURE_COUNT = "consecutive_failure_count";
    private static final String KEY_RENDERER_RESTART_COUNT = "renderer_restart_count";
    private static final String KEY_LAST_CHECKPOINT = "last_checkpoint";
    private static final String KEY_LAST_FAILED_TASK = "last_failed_task";
    private static final String KEY_LAST_FAILURE_CODE = "last_failure_code";
    private static final long NATIVE_RECOVERY_TIMEOUT_MS = 30_000L;

    private final Handler startupHandler = new Handler(Looper.getMainLooper());
    private final long startupStartedAtElapsedMs = SystemClock.elapsedRealtime();
    private SharedPreferences startupPreferences;
    private AlertDialog startupRecoveryDialog;
    private boolean startupReady = false;
    private boolean failureRecordedThisAttempt = false;
    private String lastNativeLifecycle = "native_created";
    private final Runnable startupDeadline = () -> {
        if (!startupReady) showNativeRecovery("native_first_screen_timeout");
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidPurchasesPlugin.class);
        registerPlugin(AndroidSaveTransferPlugin.class);
        registerPlugin(DeviceCapabilitiesPlugin.class);
        registerPlugin(StartupRecoveryPlugin.class);
        initializeStartupRecoveryState();
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void load() {
        // Register before Bridge.Builder#create starts loading the local page so
        // the first page-start and page-visible callbacks cannot be missed.
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageStarted(WebView webView) {
                recordNativeLifecycle("page_started");
            }

            @Override
            public void onPageCommitVisible(WebView webView, String url) {
                recordCheckpoint("html_visible");
                recordNativeLifecycle("page_commit_visible");
            }

            @Override
            public void onPageLoaded(WebView webView) {
                recordNativeLifecycle("page_loaded");
            }

            @Override
            public void onReceivedError(WebView webView) {
                // Capacitor does not expose whether this callback belongs to the
                // main document. Track it, then let the heartbeat deadline decide
                // whether startup actually became unusable.
                startupPreferences.edit().putString(KEY_LAST_FAILURE_CODE, "webview_load_error").apply();
                recordNativeLifecycle("page_error");
            }

            @Override
            public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                int rendererRestarts = startupPreferences.getInt(KEY_RENDERER_RESTART_COUNT, 0) + 1;
                startupPreferences.edit().putInt(KEY_RENDERER_RESTART_COUNT, rendererRestarts).apply();
                registerStartupFailure(detail.didCrash() ? "renderer_crashed" : "renderer_terminated", "NATIVE_WEBVIEW");
                webView.post(() -> {
                    if (webView.getParent() instanceof ViewGroup) {
                        ((ViewGroup) webView.getParent()).removeView(webView);
                    }
                    webView.destroy();
                    showNativeRecovery(detail.didCrash() ? "renderer_crashed" : "renderer_terminated");
                });
                return true;
            }
        });
        super.load();
        if (bridge == null) return;
        scheduleStartupDeadline();
    }

    private void initializeStartupRecoveryState() {
        startupPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean previousLaunchInProgress = startupPreferences.getBoolean(KEY_STARTUP_IN_PROGRESS, false);
        int failureCount = StartupRecoveryPolicy.beginLaunchFailureCount(
            previousLaunchInProgress,
            startupPreferences.getInt(KEY_FAILURE_COUNT, 0)
        );
        startupPreferences.edit()
            .putBoolean(KEY_STARTUP_IN_PROGRESS, true)
            .putInt(KEY_FAILURE_COUNT, failureCount)
            .putString(KEY_LAST_CHECKPOINT, "native_created")
            .apply();
        Log.i(TAG, "native_created failure_count=" + failureCount);
    }

    private void scheduleStartupDeadline() {
        startupHandler.removeCallbacks(startupDeadline);
        if (!startupReady) startupHandler.postDelayed(startupDeadline, NATIVE_RECOVERY_TIMEOUT_MS);
    }

    private void recordNativeLifecycle(String lifecycle) {
        lastNativeLifecycle = lifecycle;
        Log.i(TAG, lifecycle);
    }

    private void recordCheckpoint(String checkpoint) {
        if (checkpoint == null || checkpoint.length() == 0) return;
        String boundedCheckpoint = checkpoint.substring(0, Math.min(80, checkpoint.length()));
        startupPreferences.edit().putString(KEY_LAST_CHECKPOINT, boundedCheckpoint).apply();
        Log.i(TAG, "checkpoint=" + boundedCheckpoint);
    }

    private void registerStartupFailure(String failureCode, String failedTask) {
        int failureCount = StartupRecoveryPolicy.recordFailureCount(
            failureRecordedThisAttempt,
            startupPreferences.getInt(KEY_FAILURE_COUNT, 0)
        );
        failureRecordedThisAttempt = true;
        startupPreferences.edit()
            .putInt(KEY_FAILURE_COUNT, failureCount)
            .putString(KEY_LAST_FAILED_TASK, bounded(failedTask))
            .putString(KEY_LAST_FAILURE_CODE, bounded(failureCode))
            .apply();
        Log.e(TAG, "startup_failure code=" + bounded(failureCode) + " count=" + failureCount);
    }

    private void showNativeRecovery(String failureCode) {
        if (isFinishing() || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 && isDestroyed())) return;
        startupHandler.removeCallbacks(startupDeadline);
        registerStartupFailure(failureCode, "NATIVE_WEBVIEW");
        recordCheckpoint("startup_failed");
        recordCheckpoint("recovery_opened");
        if (startupRecoveryDialog != null && startupRecoveryDialog.isShowing()) return;

        startupRecoveryDialog = new AlertDialog.Builder(this)
            .setTitle("Actor Empire couldn't start")
            .setMessage("The game stopped safely before opening your career. Retry now. If it continues, restart the game. Your careers were not changed.")
            .setCancelable(false)
            .setPositiveButton("Retry", (dialog, which) -> retryStartup())
            .setNegativeButton("Restart Game", (dialog, which) -> restartGame())
            .create();
        startupRecoveryDialog.setOnShowListener(dialog -> {
            int minimumHeightPx = Math.round(48 * getResources().getDisplayMetrics().density);
            Button retryButton = startupRecoveryDialog.getButton(AlertDialog.BUTTON_POSITIVE);
            Button restartButton = startupRecoveryDialog.getButton(AlertDialog.BUTTON_NEGATIVE);
            if (retryButton != null) retryButton.setMinHeight(minimumHeightPx);
            if (restartButton != null) restartButton.setMinHeight(minimumHeightPx);
        });
        startupRecoveryDialog.show();
    }

    private void prepareForIntentionalRestart() {
        startupHandler.removeCallbacks(startupDeadline);
        startupPreferences.edit().putBoolean(KEY_STARTUP_IN_PROGRESS, false).apply();
    }

    private void retryStartup() {
        prepareForIntentionalRestart();
        recreate();
    }

    private void restartGame() {
        prepareForIntentionalRestart();
        Intent restartIntent = Intent.makeRestartActivityTask(getComponentName());
        startActivity(restartIntent);
        finish();
    }

    void onJavaScriptStartupCheckpoint(String checkpoint, String failedTask, String failureCode) {
        runOnUiThread(() -> {
            recordCheckpoint(checkpoint);
            if (failureCode != null && failureCode.length() > 0) {
                startupPreferences.edit().putString(KEY_LAST_FAILURE_CODE, bounded(failureCode)).apply();
            }
            if ("startup_failed".equals(checkpoint)) {
                registerStartupFailure(
                    failureCode == null || failureCode.length() == 0 ? "javascript_startup_failed" : failureCode,
                    failedTask == null || failedTask.length() == 0 ? "APP_CORE" : failedTask
                );
            }
            if ("first_screen_ready".equals(checkpoint)) {
                startupReady = true;
                failureRecordedThisAttempt = false;
                startupHandler.removeCallbacks(startupDeadline);
                startupPreferences.edit()
                    .putBoolean(KEY_STARTUP_IN_PROGRESS, false)
                    .putInt(KEY_FAILURE_COUNT, StartupRecoveryPolicy.successfulStartupFailureCount())
                    .putInt(KEY_RENDERER_RESTART_COUNT, 0)
                    .putString(KEY_LAST_FAILED_TASK, "")
                    .putString(KEY_LAST_FAILURE_CODE, "")
                    .apply();
                if (startupRecoveryDialog != null) startupRecoveryDialog.dismiss();
            }
        });
    }

    JSObject getStartupRecoveryState() {
        JSObject state = new JSObject();
        int failureCount = startupPreferences.getInt(KEY_FAILURE_COUNT, 0);
        state.put("available", true);
        state.put("safeModeRecommended", StartupRecoveryPolicy.shouldUseSafeMode(failureCount));
        state.put("consecutiveStartupFailures", failureCount);
        state.put("rendererRestartCount", startupPreferences.getInt(KEY_RENDERER_RESTART_COUNT, 0));
        state.put("lastCheckpoint", startupPreferences.getString(KEY_LAST_CHECKPOINT, "native_created"));
        state.put("lastFailedTask", startupPreferences.getString(KEY_LAST_FAILED_TASK, ""));
        state.put("lastFailureCode", startupPreferences.getString(KEY_LAST_FAILURE_CODE, ""));
        state.put("lastNativeLifecycle", bounded(lastNativeLifecycle));
        state.put("startupDurationMs", Math.max(0, SystemClock.elapsedRealtime() - startupStartedAtElapsedMs));
        state.put("appVersion", getAppVersion());
        state.put("androidVersion", Build.VERSION.RELEASE == null ? "unknown" : bounded(Build.VERSION.RELEASE));
        state.put("webViewVersion", getWebViewVersion());
        state.put("memoryClassMb", getMemoryClassMb());
        state.put("online", isNetworkAvailable());
        return state;
    }

    private String getAppVersion() {
        try {
            PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            return packageInfo.versionName == null ? "unknown" : bounded(packageInfo.versionName);
        } catch (Exception ignored) {
            return "unknown";
        }
    }

    private String getWebViewVersion() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return "unavailable";
        try {
            PackageInfo packageInfo = WebView.getCurrentWebViewPackage();
            return packageInfo == null || packageInfo.versionName == null ? "unavailable" : bounded(packageInfo.versionName);
        } catch (RuntimeException ignored) {
            return "unavailable";
        }
    }

    private int getMemoryClassMb() {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        return manager == null ? 0 : Math.max(0, manager.getMemoryClass());
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager manager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return false;
        Network activeNetwork = manager.getActiveNetwork();
        if (activeNetwork == null) return false;
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(activeNetwork);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private String bounded(String value) {
        if (value == null) return "";
        return value.substring(0, Math.min(80, value.length()));
    }

    @Override
    public void onResume() {
        super.onResume();
        scheduleStartupDeadline();
    }

    @Override
    public void onPause() {
        startupHandler.removeCallbacks(startupDeadline);
        super.onPause();
    }

    @Override
    public void onDestroy() {
        startupHandler.removeCallbacks(startupDeadline);
        if (startupRecoveryDialog != null) startupRecoveryDialog.dismiss();
        super.onDestroy();
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
