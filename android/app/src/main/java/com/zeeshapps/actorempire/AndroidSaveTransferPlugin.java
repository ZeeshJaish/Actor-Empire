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
            String safeFilename = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
            File exportDir = new File(getContext().getCacheDir(), "save_exports");
            if (!exportDir.exists() && !exportDir.mkdirs()) {
                call.reject("Could not prepare export folder.");
                return;
            }

            File exportFile = new File(exportDir, safeFilename);
            try (FileOutputStream outputStream = new FileOutputStream(exportFile, false)) {
                outputStream.write(content.getBytes(StandardCharsets.UTF_8));
            }

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

            call.resolve(new JSObject().put("shared", true));
        } catch (Exception error) {
            call.reject("Save export failed.", error);
        }
    }
}
