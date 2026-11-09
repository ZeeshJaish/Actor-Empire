package com.zeeshapps.actorempire;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@CapacitorPlugin(name = "AndroidSaveTransfer")
public class AndroidSaveTransferPlugin extends Plugin {
    @PluginMethod
    public void shareExport(PluginCall call) {
        String filename = call.getString("filename", "actor-empire-save-transfer.aesave");
        String content = call.getString("content");

        if (content == null || content.trim().isEmpty()) {
            call.reject("Missing export content.");
            return;
        }

        try {
            File exportFile = prepareExportFile(filename);
            if (exportFile == null) {
                call.reject("Could not prepare export folder.");
                return;
            }
            try (FileOutputStream outputStream = new FileOutputStream(exportFile, false)) {
                outputStream.write(content.getBytes(StandardCharsets.UTF_8));
            }
            shareFile(exportFile);
            call.resolve(new JSObject().put("shared", true));
        } catch (Exception error) {
            call.reject("Save export failed.", error);
        }
    }

    /* Perf plan (2026-11-08): a big career arrives in pieces of a few hundred KB, appended to the export
       file, instead of one giant string that can run the phone out of memory. */
    private static final class PendingExport {
        final File file;
        long bytes = 0;
        long chars = 0;
        PendingExport(File file) { this.file = file; }
    }
    private final Map<String, PendingExport> pendingExports = new HashMap<>();
    private static final long OLD_EXPORT_MS = 10 * 60 * 1000;

    @PluginMethod
    public void beginExport(PluginCall call) {
        String filename = call.getString("filename", "actor-empire-save-transfer.aesave");
        try {
            String id = UUID.randomUUID().toString();
            File exportsRoot = new File(getContext().getCacheDir(), "save_exports");
            removeOldExports(exportsRoot);
            // each export its own folder, so a second export never cuts a file a share target is reading
            File exportDir = new File(exportsRoot, id);
            if (!exportDir.exists() && !exportDir.mkdirs()) {
                call.reject("Could not prepare export folder.");
                return;
            }
            File exportFile = new File(exportDir, filename.replaceAll("[^a-zA-Z0-9._-]", "_"));
            try (FileOutputStream outputStream = new FileOutputStream(exportFile, false)) {
                outputStream.flush();
            }
            synchronized (pendingExports) {
                pendingExports.put(id, new PendingExport(exportFile));
            }
            call.resolve(new JSObject().put("id", id));
        } catch (Exception error) {
            call.reject("Save export failed.", error);
        }
    }

    private void removeOldExports(File exportsRoot) {
        File[] entries = exportsRoot.listFiles();
        if (entries == null) return;
        long now = System.currentTimeMillis();
        for (File entry : entries) {
            if (!entry.isDirectory() || now - entry.lastModified() < OLD_EXPORT_MS) continue;
            File[] files = entry.listFiles();
            if (files != null) for (File file : files) file.delete();
            entry.delete();
        }
    }

    @PluginMethod
    public void appendExport(PluginCall call) {
        String id = call.getString("id");
        String chunk = call.getString("chunk");
        PendingExport pending;
        synchronized (pendingExports) {
            pending = id == null ? null : pendingExports.get(id);
        }
        if (pending == null || chunk == null) {
            call.reject("Unknown export.");
            return;
        }
        if (!pending.file.exists()) {
            // the phone cleared its cache mid-export: never re-create a file that lost its start
            call.reject("Save export was interrupted.");
            return;
        }
        try (FileOutputStream outputStream = new FileOutputStream(pending.file, true)) {
            byte[] bytes = chunk.getBytes(StandardCharsets.UTF_8);
            outputStream.write(bytes);
            pending.bytes += bytes.length;
            pending.chars += chunk.length();
            call.resolve();
        } catch (Exception error) {
            call.reject("Save export failed.", error);
        }
    }

    @PluginMethod
    public void finishExport(PluginCall call) {
        String id = call.getString("id");
        Integer expectedChars = call.getInt("chars");
        PendingExport pending;
        synchronized (pendingExports) {
            pending = id == null ? null : pendingExports.remove(id);
        }
        if (pending == null || pending.file.length() == 0) {
            call.reject("Missing export content.");
            return;
        }
        // a file that lost a piece is never shared as a whole career
        if ((expectedChars != null && expectedChars != pending.chars) || pending.file.length() != pending.bytes) {
            pending.file.delete();
            call.reject("Save export was incomplete.");
            return;
        }
        try {
            shareFile(pending.file);
            call.resolve(new JSObject().put("shared", true));
        } catch (Exception error) {
            call.reject("Save export failed.", error);
        }
    }

    @PluginMethod
    public void cancelExport(PluginCall call) {
        String id = call.getString("id");
        PendingExport pending;
        synchronized (pendingExports) {
            pending = id == null ? null : pendingExports.remove(id);
        }
        if (pending != null && pending.file.exists() && !pending.file.delete()) {
            pending.file.deleteOnExit();
        }
        call.resolve();
    }

    private File prepareExportFile(String filename) {
        String safeFilename = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        File exportDir = new File(getContext().getCacheDir(), "save_exports");
        if (!exportDir.exists() && !exportDir.mkdirs()) return null;
        return new File(exportDir, safeFilename);
    }

    private void shareFile(File exportFile) {
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                exportFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/json");
            shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Actor Empire Save Transfer");
            shareIntent.putExtra(Intent.EXTRA_TEXT, "Import this signed file in Actor Empire on the Play Store build.");
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(shareIntent, "Export Actor Empire Save");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
    }
}
