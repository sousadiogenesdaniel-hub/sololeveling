package app.osistema;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Casca do app: abre o app web publicado num WebView preso a um único endereço. Qualquer outro link
 * (WhatsApp, banco, mapas) abre fora, no app certo. Também confere se há versão nova deste app Android.
 */
public class MainActivity extends Activity {
    static final String HOST = "sousadiogenesdaniel-hub.github.io";
    static final String BASE = "https://" + HOST + "/sololeveling/";
    private static final int REQ_FILE = 10, REQ_GEO = 11, REQ_NOTIF = 12;

    private WebView web;
    private ValueCallback<Uri[]> fileCb;
    private Uri cameraUri;
    private GeolocationPermissions.Callback geoCb;
    private String geoOrigin;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(Color.rgb(4, 7, 15));
        getWindow().setNavigationBarColor(Color.rgb(4, 7, 15));
        Scheduler.channels(this);

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(4, 7, 15));
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " OSistemaAndroid/" + versionName());
        WebView.setWebContentsDebuggingEnabled(false);
        web.addJavascriptInterface(new NativeBridge(this), "SistemaNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("https".equals(u.getScheme()) && HOST.equals(u.getHost()) && u.getPath() != null
                    && u.getPath().startsWith("/sololeveling") && !u.getPath().contains("/download/")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
                if (!origin.startsWith("https://" + HOST)) { cb.invoke(origin, false, false); return; }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    cb.invoke(origin, true, false);
                } else {
                    geoCb = cb; geoOrigin = origin;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_GEO);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                Intent pick = params.createIntent();
                Intent chooser = Intent.createChooser(pick, "Escolher imagem");
                cameraUri = null;
                boolean imagem = false;
                for (String t : params.getAcceptTypes()) if (t.startsWith("image")) imagem = true;
                if (imagem && Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Images.Media.DISPLAY_NAME, "sistema_" + System.currentTimeMillis() + ".jpg");
                    cv.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                    cv.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/O Sistema");
                    cameraUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
                    Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cam});
                }
                try { startActivityForResult(chooser, REQ_FILE); } catch (Exception e) { fileCb = null; return false; }
                return true;
            }
        });

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
        }
        if (b != null) web.restoreState(b); else web.loadUrl(BASE);
        checkUpdate();
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        web.evaluateJavascript("window.__nativeResume && window.__nativeResume()", null);
        Scheduler.evaluate(this);
    }

    @Override protected void onPause() { web.onPause(); super.onPause(); }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_FILE || fileCb == null) return;
        Uri[] r = WebChromeClient.FileChooserParams.parseResult(res, data);
        if ((r == null || r.length == 0) && res == RESULT_OK && cameraUri != null) r = new Uri[]{cameraUri};
        else if (cameraUri != null) { try { getContentResolver().delete(cameraUri, null, null); } catch (Exception ignored) {} }
        fileCb.onReceiveValue(r);
        fileCb = null; cameraUri = null;
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req == REQ_GEO && geoCb != null) {
            boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
            geoCb.invoke(geoOrigin, ok, false);
            geoCb = null;
        }
    }

    private String versionName() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "?"; }
    }

    private long versionCode() {
        try {
            android.content.pm.PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
        } catch (Exception e) { return 0; }
    }

    /** Confere download/versao.json no site; se houver versão nova, oferece baixar. */
    private void checkUpdate() {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(BASE + "download/versao.json?t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(8000); c.setReadTimeout(8000); c.setUseCaches(false);
                if (c.getResponseCode() != 200) return;
                String body;
                try (InputStream in = c.getInputStream()) {
                    java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                    byte[] buf = new byte[4096]; int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    body = out.toString("UTF-8");
                }
                JSONObject o = new JSONObject(body);
                if (o.optLong("versionCode", 0) <= versionCode()) return;
                String novidades = o.optString("novidades", "");
                runOnUiThread(() -> new AlertDialog.Builder(this)
                    .setTitle("Nova versão do app Android (" + o.optString("versionName") + ")")
                    .setMessage((novidades.isEmpty() ? "" : novidades + "\n\n") + "Baixe e instale por cima: seus dados continuam.")
                    .setPositiveButton("Baixar", (d, w) -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BASE + "download/o-sistema.apk"))))
                    .setNegativeButton("Depois", null).show());
            } catch (Throwable ignored) {}
        }).start();
    }
}
