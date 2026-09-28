package com.zeeshapps.actorempire;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AndroidSaveTransfer")
public class AndroidSaveTransferPlugin extends Plugin {
    private static final int RAW_CHUNK_BYTES = SaveTransferStreamSession.RAW_CHUNK_BYTES;
    private static final int MAX_BASE64_CHARS = 4 * ((RAW_CHUNK_BYTES + 2) / 3);
    private static final long MAX_LEGACY_IMPORT_BYTES = 8L * 1024L * 1024L;
    private static final long SESSION_MAX_AGE_MS = 24L * 60L * 60L * 1000L;

    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();
    private final Map<String, ExportSession> exportSessions = new ConcurrentHashMap<>();
    private final Map<String, ImportSession> importSessions = new ConcurrentHashMap<>();

    @PluginMethod
    public void beginExport(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                cleanupStaleSessions();
                String id = UUID.randomUUID().toString();
                String filename = sanitizeFilename(call.getString("filename", "actor-empire-save-transfer.aesave"));
                File directory = new File(sessionRoot(), "export-" + id);
                if (!directory.mkdirs()) throw new IOException("Could not prepare export session.");
                ExportSession session = new ExportSession(id, filename, directory);
                exportSessions.put(id, session);
                call.resolve(new JSObject()
                    .put("sessionId", id)
                    .put("maxChunkBytes", RAW_CHUNK_BYTES)
                    .put("maxBase64Chars", MAX_BASE64_CHARS));
            } catch (Exception error) {
                call.reject("Could not begin streamed save export.", error);
            }
        });
    }

    @PluginMethod
    public void beginExportRecord(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                ExportSession session = requireExportSession(call);
                session.beginRecord(requireText(call.getString("recordId"), "record id"));
                call.resolve();
            } catch (Exception error) {
                call.reject("Could not begin export record.", error);
            }
        });
    }

    @PluginMethod
    public void appendExportChunk(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                byte[] bytes = decodeBoundedChunk(call.getString("dataBase64"));
                requireExportSession(call).appendRecord(bytes);
                call.resolve(new JSObject().put("acceptedBytes", bytes.length));
            } catch (Exception error) {
                call.reject("Could not append export chunk.", error);
            }
        });
    }

    @PluginMethod
    public void finishExportRecord(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                ExportedRecord record = requireExportSession(call).finishRecord();
                call.resolve(new JSObject()
                    .put("recordId", record.id)
                    .put("byteLength", record.byteLength)
                    .put("sha256", record.sha256));
            } catch (Exception error) {
                call.reject("Could not finish export record.", error);
            }
        });
    }

    @PluginMethod
    public void beginExportManifest(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                requireExportSession(call).beginManifest(requireLong(call.getLong("byteLength"), "manifest length"));
                call.resolve();
            } catch (Exception error) {
                call.reject("Could not begin export manifest.", error);
            }
        });
    }

    @PluginMethod
    public void appendExportManifestChunk(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                byte[] bytes = decodeBoundedChunk(call.getString("dataBase64"));
                requireExportSession(call).appendManifest(bytes);
                call.resolve(new JSObject().put("acceptedBytes", bytes.length));
            } catch (Exception error) {
                call.reject("Could not append export manifest.", error);
            }
        });
    }

    @PluginMethod
    public void finalizeExport(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                SaveTransferStreamSession.DigestResult result = requireExportSession(call).finalizeArchive(exportRoot());
                call.resolve(new JSObject().put("byteLength", result.byteLength).put("sha256", result.sha256));
            } catch (Exception error) {
                cancelExportSession(call.getString("sessionId"));
                call.reject("Could not finalize streamed save export.", error);
            }
        });
    }

    @PluginMethod
    public void shareStreamedExport(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                ExportSession session = requireExportSession(call);
                if (session.finalFile == null || !session.finalFile.isFile()) throw new IOException("Export file is not finalized.");
                shareFile(session.finalFile);
                session.deleteWorkingFiles();
                exportSessions.remove(session.id);
                call.resolve(new JSObject().put("shared", true));
            } catch (Exception error) {
                call.reject("Could not share streamed save export.", error);
            }
        });
    }

    @PluginMethod
    public void cancelExport(PluginCall call) {
        ioExecutor.execute(() -> {
            cancelExportSession(call.getString("sessionId"));
            call.resolve();
        });
    }

    @PluginMethod
    public void beginImport(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
            "application/octet-stream", "application/json", "text/json", "text/plain"
        });
        startActivityForResult(call, intent, "handleImportSelection");
    }

    @ActivityCallback
    private void handleImportSelection(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("No transfer file selected.");
            return;
        }
        Uri uri = result.getData().getData();
        ioExecutor.execute(() -> {
            try {
                cleanupStaleSessions();
                BufferedInputStream input = new BufferedInputStream(requireInputStream(uri), RAW_CHUNK_BYTES);
                input.mark(16);
                byte[] prefix = new byte[8];
                int prefixBytes = input.read(prefix);
                input.reset();
                boolean isV2 = prefixBytes == 8 && "AESAVE2\n".equals(new String(prefix, StandardCharsets.US_ASCII));
                String id = UUID.randomUUID().toString();
                ImportSession session = new ImportSession(id, input, isV2, querySize(uri));
                importSessions.put(id, session);
                call.resolve(new JSObject()
                    .put("sessionId", id)
                    .put("formatVersion", isV2 ? 2 : 1)
                    .put("totalBytes", session.totalBytes)
                    .put("maxChunkBytes", RAW_CHUNK_BYTES));
            } catch (Exception error) {
                call.reject("Could not open save transfer file.", error);
            }
        });
    }

    @PluginMethod
    public void prepareImportManifest(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                int byteLength = requireV2ImportSession(call).prepareManifest();
                call.resolve(new JSObject().put("byteLength", byteLength));
            } catch (Exception error) {
                cancelImportSession(call.getString("sessionId"));
                call.reject("Could not read save-transfer manifest.", error);
            }
        });
    }

    @PluginMethod
    public void readImportManifestChunk(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                byte[] bytes = requireV2ImportSession(call).readManifestChunk(requestedChunkBytes(call));
                call.resolve(chunkResult(bytes, bytes.length == 0));
            } catch (Exception error) {
                cancelImportSession(call.getString("sessionId"));
                call.reject("Could not stream save-transfer manifest.", error);
            }
        });
    }

    @PluginMethod
    public void beginImportRecord(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                SaveTransferStreamSession.RecordHeader header = requireV2ImportSession(call).reader.beginRecord();
                call.resolve(new JSObject().put("headerJson", header.headerJson).put("byteLength", header.byteLength));
            } catch (Exception error) {
                cancelImportSession(call.getString("sessionId"));
                call.reject("Could not begin save-transfer record.", error);
            }
        });
    }

    @PluginMethod
    public void readImportRecordChunk(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                byte[] bytes = requireV2ImportSession(call).reader.readRecordChunk(requestedChunkBytes(call));
                call.resolve(chunkResult(bytes, bytes.length == 0));
            } catch (Exception error) {
                cancelImportSession(call.getString("sessionId"));
                call.reject("Could not stream save-transfer record.", error);
            }
        });
    }

    @PluginMethod
    public void finishImportRecord(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                SaveTransferStreamSession.DigestResult result = requireV2ImportSession(call).reader.finishRecord();
                call.resolve(new JSObject().put("byteLength", result.byteLength).put("sha256", result.sha256));
            } catch (Exception error) {
                cancelImportSession(call.getString("sessionId"));
                call.reject("Could not verify save-transfer record.", error);
            }
        });
    }

    @PluginMethod
    public void readLegacyImportChunk(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                ImportSession session = requireImportSession(call);
                if (session.isV2) throw new IOException("V2 transfers must use framed record streaming.");
                byte[] bytes = session.readLegacyChunk(requestedChunkBytes(call));
                call.resolve(chunkResult(bytes, bytes.length == 0));
            } catch (Exception error) {
                cancelImportSession(call.getString("sessionId"));
                call.reject("Could not stream legacy save transfer.", error);
            }
        });
    }

    @PluginMethod
    public void finishImport(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                ImportSession session = requireImportSession(call);
                if (session.isV2) session.reader.finishArchive();
                else session.close();
                importSessions.remove(session.id);
                call.resolve(new JSObject()
                    .put("recordCount", session.isV2 ? session.reader.getRecordCount() : 0)
                    .put("recordBytes", session.isV2 ? session.reader.getTotalRecordBytes() : session.legacyBytes));
            } catch (Exception error) {
                cancelImportSession(call.getString("sessionId"));
                call.reject("Save-transfer file did not finish cleanly.", error);
            }
        });
    }

    @PluginMethod
    public void cancelImport(PluginCall call) {
        ioExecutor.execute(() -> {
            cancelImportSession(call.getString("sessionId"));
            call.resolve();
        });
    }

    // Kept only for small V1 archives and older web bundles. New Android builds
    // use the bounded session methods above for V2.
    @PluginMethod
    public void shareExport(PluginCall call) {
        String filename = call.getString("filename", "actor-empire-save-transfer.aesave");
        String content = call.getString("content");
        if (content == null || content.trim().isEmpty()) {
            call.reject("Missing export content.");
            return;
        }
        ioExecutor.execute(() -> {
            try {
                byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
                if (bytes.length > MAX_LEGACY_IMPORT_BYTES) throw new IOException("Legacy export exceeds the safe native limit.");
                File exportFile = availableExportFile(exportRoot(), sanitizeFilename(filename));
                try (FileOutputStream output = new FileOutputStream(exportFile, false)) {
                    output.write(bytes);
                    output.getFD().sync();
                }
                shareFile(exportFile);
                call.resolve(new JSObject().put("shared", true));
            } catch (Exception error) {
                call.reject("Save export failed.", error);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        for (ExportSession session : exportSessions.values()) session.cancel();
        for (ImportSession session : importSessions.values()) closeQuietly(session);
        exportSessions.clear();
        importSessions.clear();
        ioExecutor.shutdownNow();
    }

    private void shareFile(File exportFile) {
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", exportFile);
        Intent shareIntent = new Intent(Intent.ACTION_SEND);
        shareIntent.setType("application/octet-stream");
        shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
        shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Actor Empire Save Transfer");
        shareIntent.putExtra(Intent.EXTRA_TEXT, "Import this signed file in Actor Empire.");
        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        Intent chooser = Intent.createChooser(shareIntent, "Export Actor Empire Save");
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(chooser);
    }

    private File sessionRoot() throws IOException {
        File root = new File(getContext().getCacheDir(), "save_transfer_sessions");
        if (!root.exists() && !root.mkdirs()) throw new IOException("Could not prepare transfer sessions.");
        return root;
    }

    private File exportRoot() throws IOException {
        File root = new File(getContext().getCacheDir(), "save_exports");
        if (!root.exists() && !root.mkdirs()) throw new IOException("Could not prepare export folder.");
        return root;
    }

    private ExportSession requireExportSession(PluginCall call) throws IOException {
        String id = requireText(call.getString("sessionId"), "export session");
        ExportSession session = exportSessions.get(id);
        if (session == null) throw new IOException("Export session is missing or expired.");
        session.touch();
        return session;
    }

    private ImportSession requireImportSession(PluginCall call) throws IOException {
        String id = requireText(call.getString("sessionId"), "import session");
        ImportSession session = importSessions.get(id);
        if (session == null) throw new IOException("Import session is missing or expired.");
        session.touch();
        return session;
    }

    private ImportSession requireV2ImportSession(PluginCall call) throws IOException {
        ImportSession session = requireImportSession(call);
        if (!session.isV2 || session.reader == null) throw new IOException("Transfer is not a V2 framed archive.");
        return session;
    }

    private void cancelExportSession(String id) {
        if (id == null) return;
        ExportSession session = exportSessions.remove(id);
        if (session != null) session.cancel();
    }

    private void cancelImportSession(String id) {
        if (id == null) return;
        ImportSession session = importSessions.remove(id);
        closeQuietly(session);
    }

    private void cleanupStaleSessions() throws IOException {
        long cutoff = System.currentTimeMillis() - SESSION_MAX_AGE_MS;
        for (ExportSession session : exportSessions.values()) {
            if (session.touchedAt < cutoff && exportSessions.remove(session.id, session)) session.cancel();
        }
        for (ImportSession session : importSessions.values()) {
            if (session.touchedAt < cutoff && importSessions.remove(session.id, session)) closeQuietly(session);
        }
        File[] files = sessionRoot().listFiles();
        if (files != null) for (File file : files) if (file.lastModified() < cutoff) deleteRecursively(file);
    }

    private InputStream requireInputStream(Uri uri) throws IOException {
        InputStream input = getContext().getContentResolver().openInputStream(uri);
        if (input == null) throw new IOException("Selected transfer file cannot be opened.");
        return input;
    }

    private long querySize(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.SIZE }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (index >= 0 && !cursor.isNull(index)) return Math.max(-1L, cursor.getLong(index));
            }
        } catch (Exception ignored) {
            // Unknown size is safe: streamed limits still apply while reading.
        }
        return -1L;
    }

    private static int requestedChunkBytes(PluginCall call) throws IOException {
        Integer requested = call.getInt("maxBytes", RAW_CHUNK_BYTES);
        if (requested == null || requested <= 0 || requested > RAW_CHUNK_BYTES) throw new IOException("Requested transfer chunk exceeds the native limit.");
        return requested;
    }

    private static byte[] decodeBoundedChunk(String encoded) throws IOException {
        if (encoded == null || encoded.isEmpty()) throw new IOException("Transfer chunk is empty.");
        if (encoded.length() > MAX_BASE64_CHARS) throw new IOException("Encoded transfer chunk exceeds the native limit.");
        try {
            byte[] bytes = Base64.decode(encoded, Base64.NO_WRAP);
            if (bytes.length == 0 || bytes.length > RAW_CHUNK_BYTES) throw new IOException("Transfer chunk exceeds the native limit.");
            return bytes;
        } catch (IllegalArgumentException error) {
            throw new IOException("Transfer chunk is not valid base64.", error);
        }
    }

    private static JSObject chunkResult(byte[] bytes, boolean done) {
        return new JSObject()
            .put("dataBase64", bytes.length == 0 ? "" : Base64.encodeToString(bytes, Base64.NO_WRAP))
            .put("byteLength", bytes.length)
            .put("done", done);
    }

    private static String requireText(String value, String label) throws IOException {
        if (value == null || value.trim().isEmpty() || value.length() > 200) throw new IOException("Invalid " + label + ".");
        return value;
    }

    private static long requireLong(Long value, String label) throws IOException {
        if (value == null || value < 0) throw new IOException("Invalid " + label + ".");
        return value;
    }

    private static String sanitizeFilename(String filename) {
        String safe = filename == null ? "actor-empire-save-transfer.aesave" : filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (safe.isEmpty()) safe = "actor-empire-save-transfer.aesave";
        if (!safe.endsWith(".aesave")) safe += ".aesave";
        return safe;
    }

    private static File availableExportFile(File directory, String filename) {
        File candidate = new File(directory, filename);
        if (!candidate.exists()) return candidate;
        String stem = filename.endsWith(".aesave") ? filename.substring(0, filename.length() - 7) : filename;
        for (int index = 1; index < 10_000; index += 1) {
            candidate = new File(directory, stem + "-" + index + ".aesave");
            if (!candidate.exists()) return candidate;
        }
        return new File(directory, stem + "-" + UUID.randomUUID() + ".aesave");
    }

    private static void copyFile(File source, OutputStream output, MessageDigest digest) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        try (InputStream input = new FileInputStream(source)) {
            while (true) {
                int read = input.read(buffer);
                if (read < 0) break;
                if (read == 0) continue;
                output.write(buffer, 0, read);
                digest.update(buffer, 0, read);
            }
        }
    }

    private static void writeAndDigest(OutputStream output, MessageDigest digest, byte[] bytes) throws IOException {
        output.write(bytes);
        digest.update(bytes);
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) deleteRecursively(child);
        }
        file.delete();
    }

    private static void closeQuietly(Closeable closeable) {
        if (closeable == null) return;
        try {
            closeable.close();
        } catch (IOException ignored) {
            // Best-effort cancellation cleanup.
        }
    }

    private static final class ExportedRecord {
        final String id;
        final File file;
        final long byteLength;
        final String sha256;

        ExportedRecord(String id, File file, long byteLength, String sha256) {
            this.id = id;
            this.file = file;
            this.byteLength = byteLength;
            this.sha256 = sha256;
        }
    }

    private static final class ExportSession {
        final String id;
        final String filename;
        final File directory;
        final LinkedHashMap<String, ExportedRecord> records = new LinkedHashMap<>();
        volatile long touchedAt = System.currentTimeMillis();
        SaveTransferStreamSession.ExportRecord activeRecord;
        String activeRecordId;
        SaveTransferStreamSession.ExportRecord manifestRecord;
        long expectedManifestBytes = -1;
        long totalRecordBytes;
        File finalFile;

        ExportSession(String id, String filename, File directory) {
            this.id = id;
            this.filename = filename;
            this.directory = directory;
        }

        void touch() {
            touchedAt = System.currentTimeMillis();
            directory.setLastModified(touchedAt);
        }

        void beginRecord(String recordId) throws IOException {
            if (finalFile != null || manifestRecord != null || activeRecord != null) throw new IOException("Export session is not ready for another record.");
            if (records.size() >= SaveTransferStreamSession.MAX_RECORDS) throw new IOException("Export exceeds the record-count limit.");
            if (records.containsKey(recordId)) throw new IOException("Export contains a duplicate record id.");
            activeRecord = new SaveTransferStreamSession.ExportRecord(directory, recordId, RAW_CHUNK_BYTES);
            activeRecordId = recordId;
        }

        void appendRecord(byte[] bytes) throws IOException {
            if (activeRecord == null) throw new IOException("No export record is active.");
            activeRecord.append(bytes);
        }

        ExportedRecord finishRecord() throws IOException {
            if (activeRecord == null || activeRecordId == null) throw new IOException("No export record is active.");
            SaveTransferStreamSession.DigestResult result = activeRecord.finish();
            if (totalRecordBytes + result.byteLength > SaveTransferStreamSession.MAX_TOTAL_RECORD_BYTES) {
                activeRecord.cancel();
                activeRecord = null;
                activeRecordId = null;
                throw new IOException("Export exceeds the total byte limit.");
            }
            ExportedRecord record = new ExportedRecord(activeRecordId, activeRecord.getFile(), result.byteLength, result.sha256);
            records.put(record.id, record);
            totalRecordBytes += result.byteLength;
            activeRecord = null;
            activeRecordId = null;
            return record;
        }

        void beginManifest(long byteLength) throws IOException {
            if (activeRecord != null || manifestRecord != null || records.isEmpty()) throw new IOException("Export records must finish before the manifest.");
            if (byteLength <= 0 || byteLength > SaveTransferStreamSession.MAX_MANIFEST_BYTES) throw new IOException("Manifest exceeds its byte limit.");
            expectedManifestBytes = byteLength;
            manifestRecord = new SaveTransferStreamSession.ExportRecord(directory, "manifest", RAW_CHUNK_BYTES);
        }

        void appendManifest(byte[] bytes) throws IOException {
            if (manifestRecord == null) throw new IOException("Export manifest is not active.");
            if (manifestRecord.getByteLength() + bytes.length > expectedManifestBytes) throw new IOException("Manifest exceeds its declared length.");
            manifestRecord.append(bytes);
        }

        SaveTransferStreamSession.DigestResult finalizeArchive(File exportRoot) throws Exception {
            if (activeRecord != null || manifestRecord == null) throw new IOException("Export session is incomplete.");
            SaveTransferStreamSession.DigestResult manifestResult = manifestRecord.finish();
            if (manifestResult.byteLength != expectedManifestBytes) throw new IOException("Manifest ended before its declared length.");
            byte[] manifestBytes = readSmallFile(manifestRecord.getFile(), SaveTransferStreamSession.MAX_MANIFEST_BYTES);
            JSONObject manifest = new JSONObject(new String(manifestBytes, StandardCharsets.UTF_8));
            if (!"actor-empire-save-transfer".equals(manifest.optString("format")) || manifest.optInt("formatVersion") != 2) throw new IOException("Manifest format is invalid.");
            JSONArray descriptors = manifest.optJSONArray("records");
            if (descriptors == null || descriptors.length() != records.size()) throw new IOException("Manifest record count does not match streamed records.");
            long declaredTotal = 0;
            LinkedHashMap<String, JSONObject> ordered = new LinkedHashMap<>();
            for (int index = 0; index < descriptors.length(); index += 1) {
                JSONObject descriptor = descriptors.getJSONObject(index);
                String recordId = descriptor.optString("id", "");
                ExportedRecord record = records.get(recordId);
                if (record == null || ordered.containsKey(recordId)) throw new IOException("Manifest record order contains an unknown or duplicate id.");
                if (descriptor.optLong("byteLength", -1) != record.byteLength || !record.sha256.equals(descriptor.optString("sha256"))) throw new IOException("Manifest record integrity does not match streamed bytes.");
                declaredTotal += record.byteLength;
                if (declaredTotal > SaveTransferStreamSession.MAX_TOTAL_RECORD_BYTES) throw new IOException("Export exceeds the total byte limit.");
                ordered.put(recordId, descriptor);
            }

            File partial = new File(directory, "archive.aesave.part");
            MessageDigest archiveDigest = SaveTransferStreamSession.newSha256();
            long archiveBytes;
            try (FileOutputStream fileOutput = new FileOutputStream(partial, false);
                 BufferedOutputStream output = new BufferedOutputStream(fileOutput, 64 * 1024)) {
                writeAndDigest(output, archiveDigest, ("AESAVE2\n" + manifestBytes.length + "\n").getBytes(StandardCharsets.US_ASCII));
                writeAndDigest(output, archiveDigest, manifestBytes);
                writeAndDigest(output, archiveDigest, new byte[] { '\n' });
                for (Map.Entry<String, JSONObject> entry : ordered.entrySet()) {
                    byte[] header = entry.getValue().toString().getBytes(StandardCharsets.UTF_8);
                    ExportedRecord record = records.get(entry.getKey());
                    writeAndDigest(output, archiveDigest, ("RECORD\n" + header.length + "\n").getBytes(StandardCharsets.US_ASCII));
                    writeAndDigest(output, archiveDigest, header);
                    writeAndDigest(output, archiveDigest, ("\n" + record.byteLength + "\n").getBytes(StandardCharsets.US_ASCII));
                    copyFile(record.file, output, archiveDigest);
                }
                output.flush();
                fileOutput.getFD().sync();
                archiveBytes = partial.length();
            }
            File destination = availableExportFile(exportRoot, filename);
            if (!partial.renameTo(destination)) throw new IOException("Could not atomically finalize save transfer.");
            finalFile = destination;
            return new SaveTransferStreamSession.DigestResult(archiveBytes, SaveTransferStreamSession.base64Url(archiveDigest.digest()));
        }

        void deleteWorkingFiles() {
            deleteRecursively(directory);
        }

        void cancel() {
            if (activeRecord != null) activeRecord.cancel();
            if (manifestRecord != null) manifestRecord.cancel();
            deleteWorkingFiles();
            if (finalFile != null && finalFile.exists()) finalFile.delete();
        }

        private static byte[] readSmallFile(File file, int maxBytes) throws IOException {
            if (!file.isFile() || file.length() < 1 || file.length() > maxBytes) throw new IOException("Manifest file is invalid.");
            ByteArrayOutputStream output = new ByteArrayOutputStream((int) file.length());
            byte[] buffer = new byte[16 * 1024];
            try (InputStream input = new FileInputStream(file)) {
                while (true) {
                    int read = input.read(buffer);
                    if (read < 0) break;
                    output.write(buffer, 0, read);
                }
            }
            return output.toByteArray();
        }
    }

    private static final class ImportSession implements Closeable {
        final String id;
        final BufferedInputStream input;
        final boolean isV2;
        final long totalBytes;
        final SaveTransferStreamSession.ImportReader reader;
        volatile long touchedAt = System.currentTimeMillis();
        byte[] manifestBytes;
        int manifestOffset;
        long legacyBytes;

        ImportSession(String id, BufferedInputStream input, boolean isV2, long totalBytes) {
            this.id = id;
            this.input = input;
            this.isV2 = isV2;
            this.totalBytes = totalBytes;
            this.reader = isV2 ? new SaveTransferStreamSession.ImportReader(input) : null;
        }

        void touch() {
            touchedAt = System.currentTimeMillis();
        }

        int prepareManifest() throws IOException {
            if (!isV2 || reader == null) throw new IOException("Transfer does not contain a V2 manifest.");
            if (manifestBytes != null) throw new IOException("Transfer manifest was already prepared.");
            manifestBytes = reader.readManifest().getBytes(StandardCharsets.UTF_8);
            return manifestBytes.length;
        }

        byte[] readManifestChunk(int maxBytes) throws IOException {
            if (manifestBytes == null) throw new IOException("Transfer manifest is not prepared.");
            if (manifestOffset >= manifestBytes.length) return new byte[0];
            int length = Math.min(maxBytes, manifestBytes.length - manifestOffset);
            byte[] chunk = new byte[length];
            System.arraycopy(manifestBytes, manifestOffset, chunk, 0, length);
            manifestOffset += length;
            return chunk;
        }

        byte[] readLegacyChunk(int maxBytes) throws IOException {
            if (isV2) throw new IOException("Transfer is not a legacy archive.");
            byte[] buffer = new byte[maxBytes];
            int read = input.read(buffer);
            if (read < 0) return new byte[0];
            legacyBytes += read;
            if (legacyBytes > MAX_LEGACY_IMPORT_BYTES) throw new IOException("Legacy transfer exceeds the safe import limit.");
            if (read == buffer.length) return buffer;
            byte[] exact = new byte[read];
            System.arraycopy(buffer, 0, exact, 0, read);
            return exact;
        }

        @Override
        public void close() throws IOException {
            if (reader != null) reader.close();
            else input.close();
            manifestBytes = null;
        }
    }
}
