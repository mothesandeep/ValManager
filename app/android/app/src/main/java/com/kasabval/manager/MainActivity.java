package com.kasabval.manager;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static volatile String pendingShareJson = null;

    public class NativeShareInterface {
        @JavascriptInterface
        public String getPendingShare() {
            String payload = pendingShareJson;
            pendingShareJson = null; // consume once
            return payload;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register synchronous JavascriptInterface so webview can query pending share on cold start
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.addJavascriptInterface(new NativeShareInterface(), "AndroidNativeShare");
        }

        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
    }

    private void handleSendIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            try {
                JSONObject data = new JSONObject();
                data.put("timestamp", System.currentTimeMillis());

                if ("text/plain".equals(type) || type.startsWith("text/")) {
                    String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                    String sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
                    if (sharedText != null && !sharedText.trim().isEmpty()) {
                        data.put("type", "text");
                        data.put("text", sharedText.trim());
                        data.put("subject", sharedSubject != null ? sharedSubject.trim() : "");
                        broadcastSharedData(data);
                    }
                } else if (type.startsWith("image/")) {
                    Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                    if (imageUri != null) {
                        data.put("type", "image");
                        data.put("uri", imageUri.toString());
                        broadcastSharedData(data);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void broadcastSharedData(JSONObject data) {
        pendingShareJson = data.toString();

        runOnUiThread(() -> {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                try {
                    webView.addJavascriptInterface(new NativeShareInterface(), "AndroidNativeShare");
                } catch (Exception ignored) {}

                String script = "window.__PENDING_NATIVE_SHARE__ = " + pendingShareJson + ";"
                        + "window.dispatchEvent(new CustomEvent('kasab:native-share', { detail: " + pendingShareJson + " }));";
                webView.evaluateJavascript(script, null);
            }
        });
    }
}
