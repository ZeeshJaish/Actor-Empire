package com.zeeshapps.actorempire;

import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.EOFException;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

final class SaveTransferStreamSession {
    static final int RAW_CHUNK_BYTES = 128 * 1024;
    static final int MAX_MANIFEST_BYTES = 512 * 1024;
    static final int MAX_RECORD_HEADER_BYTES = 16 * 1024;
    static final int MAX_RECORDS = 643;
    static final long MAX_RECORD_BYTES = 128L * 1024L * 1024L;
    static final long MAX_TOTAL_RECORD_BYTES = 512L * 1024L * 1024L;

    private SaveTransferStreamSession() {}

    static final class DigestResult {
        final long byteLength;
        final String sha256;

        DigestResult(long byteLength, String sha256) {
            this.byteLength = byteLength;
            this.sha256 = sha256;
        }
    }

    static final class ExportRecord implements Closeable {
        private final File file;
        private final int chunkLimit;
        private final MessageDigest digest;
        private FileOutputStream output;
        private long byteLength;
        private boolean finished;

        ExportRecord(File directory, String recordId, int chunkLimit) throws IOException {
            if (chunkLimit <= 0 || chunkLimit > RAW_CHUNK_BYTES) {
                throw new IllegalArgumentException("Invalid save-transfer chunk limit.");
            }
            if (!directory.exists() && !directory.mkdirs()) {
                throw new IOException("Could not prepare save-transfer record folder.");
            }
            String safeId = recordId == null ? "record" : recordId.replaceAll("[^a-zA-Z0-9._-]", "_");
            this.file = File.createTempFile(safeId + "-", ".record.part", directory);
            this.chunkLimit = chunkLimit;
            this.digest = newSha256();
            this.output = new FileOutputStream(file, false);
        }

        synchronized void append(byte[] bytes) throws IOException {
            if (finished || output == null) throw new IOException("Export record is already closed.");
            if (bytes == null || bytes.length == 0) throw new IllegalArgumentException("Export chunk is empty.");
            if (bytes.length > chunkLimit) throw new IllegalArgumentException("Export chunk exceeds the chunk limit.");
            if (byteLength + bytes.length > MAX_RECORD_BYTES) throw new IOException("Export record exceeds its byte limit.");
            output.write(bytes);
            digest.update(bytes);
            byteLength += bytes.length;
        }

        synchronized DigestResult finish() throws IOException {
            if (finished) throw new IOException("Export record is already closed.");
            output.getFD().sync();
            output.close();
            output = null;
            finished = true;
            return new DigestResult(byteLength, base64Url(digest.digest()));
        }

        synchronized long getByteLength() {
            return byteLength;
        }

        File getFile() {
            return file;
        }

        synchronized void cancel() {
            try {
                close();
            } catch (IOException ignored) {
                // Deleting the partial file remains the important cleanup step.
            }
            if (file.exists()) file.delete();
        }

        @Override
        public synchronized void close() throws IOException {
            if (output != null) {
                output.close();
                output = null;
            }
        }
    }

    static final class RecordHeader {
        final String headerJson;
        final long byteLength;

        RecordHeader(String headerJson, long byteLength) {
            this.headerJson = headerJson;
            this.byteLength = byteLength;
        }
    }

    static final class ImportReader implements Closeable {
        private final InputStream input;
        private MessageDigest recordDigest;
        private long recordRemaining;
        private long currentRecordBytes;
        private long totalRecordBytes;
        private int recordCount;
        private boolean manifestRead;
        private boolean closed;

        ImportReader(InputStream input) {
            if (input == null) throw new IllegalArgumentException("Import stream is required.");
            this.input = input;
        }

        synchronized String readManifest() throws IOException {
            ensureOpen();
            if (manifestRead) throw new IOException("Transfer manifest was already read.");
            if (!"AESAVE2".equals(readAsciiLine(16))) throw new IOException("Transfer is not an AESAVE2 archive.");
            int manifestBytes = parseBoundedInt(readAsciiLine(24), 1, MAX_MANIFEST_BYTES, "manifest length");
            byte[] manifest = readExact(manifestBytes);
            requireNewline();
            manifestRead = true;
            return new String(manifest, java.nio.charset.StandardCharsets.UTF_8);
        }

        synchronized RecordHeader beginRecord() throws IOException {
            ensureOpen();
            if (!manifestRead) throw new IOException("Read the transfer manifest first.");
            if (recordDigest != null) throw new IOException("Finish the active transfer record first.");
            if (recordCount >= MAX_RECORDS) throw new IOException("Transfer exceeds the record-count limit.");
            if (!"RECORD".equals(readAsciiLine(16))) throw new IOException("Transfer record marker is invalid.");
            int headerBytes = parseBoundedInt(readAsciiLine(24), 2, MAX_RECORD_HEADER_BYTES, "record header length");
            byte[] header = readExact(headerBytes);
            requireNewline();
            long declaredBytes = parseBoundedLong(readAsciiLine(32), 0, MAX_RECORD_BYTES, "record length");
            if (totalRecordBytes + declaredBytes > MAX_TOTAL_RECORD_BYTES) {
                throw new IOException("Transfer exceeds the total byte limit.");
            }
            recordDigest = newSha256();
            recordRemaining = declaredBytes;
            currentRecordBytes = 0;
            recordCount += 1;
            totalRecordBytes += declaredBytes;
            return new RecordHeader(new String(header, java.nio.charset.StandardCharsets.UTF_8), declaredBytes);
        }

        synchronized byte[] readRecordChunk(int requestedBytes) throws IOException {
            ensureOpen();
            if (recordDigest == null) throw new IOException("No active transfer record.");
            if (requestedBytes <= 0 || requestedBytes > RAW_CHUNK_BYTES) {
                throw new IllegalArgumentException("Import chunk exceeds the chunk limit.");
            }
            if (recordRemaining == 0) return new byte[0];
            int length = (int) Math.min((long) requestedBytes, recordRemaining);
            byte[] bytes = new byte[length];
            int offset = 0;
            while (offset < length) {
                int read = input.read(bytes, offset, length - offset);
                if (read < 0) throw new EOFException("Transfer ended before the declared record length.");
                if (read == 0) continue;
                offset += read;
            }
            recordDigest.update(bytes);
            recordRemaining -= length;
            currentRecordBytes += length;
            return bytes;
        }

        synchronized DigestResult finishRecord() throws IOException {
            ensureOpen();
            if (recordDigest == null) throw new IOException("No active transfer record.");
            if (recordRemaining != 0) throw new IOException("Transfer record ended before its declared length.");
            DigestResult result = new DigestResult(currentRecordBytes, base64Url(recordDigest.digest()));
            recordDigest = null;
            currentRecordBytes = 0;
            return result;
        }

        synchronized void finishArchive() throws IOException {
            ensureOpen();
            if (!manifestRead) throw new IOException("Transfer manifest was not read.");
            if (recordDigest != null) throw new IOException("Transfer has an unfinished record.");
            if (input.read() != -1) throw new IOException("Transfer has unexpected trailing data.");
            close();
        }

        int getRecordCount() {
            return recordCount;
        }

        long getTotalRecordBytes() {
            return totalRecordBytes;
        }

        private byte[] readExact(int byteLength) throws IOException {
            byte[] value = new byte[byteLength];
            int offset = 0;
            while (offset < byteLength) {
                int read = input.read(value, offset, byteLength - offset);
                if (read < 0) throw new EOFException("Transfer ended unexpectedly.");
                if (read == 0) continue;
                offset += read;
            }
            return value;
        }

        private String readAsciiLine(int maxBytes) throws IOException {
            ByteArrayOutputStream line = new ByteArrayOutputStream(Math.min(maxBytes, 128));
            while (true) {
                int next = input.read();
                if (next < 0) throw new EOFException("Transfer ended while reading framing.");
                if (next == '\n') break;
                if (line.size() >= maxBytes) throw new IOException("Transfer framing line exceeds its limit.");
                line.write(next);
            }
            byte[] bytes = line.toByteArray();
            if (bytes.length > 0 && bytes[bytes.length - 1] == '\r') {
                throw new IOException("Transfer framing must use canonical newlines.");
            }
            return new String(bytes, java.nio.charset.StandardCharsets.US_ASCII);
        }

        private void requireNewline() throws IOException {
            if (input.read() != '\n') throw new IOException("Transfer framing newline is missing.");
        }

        private void ensureOpen() throws IOException {
            if (closed) throw new IOException("Transfer stream is closed.");
        }

        @Override
        public synchronized void close() throws IOException {
            if (closed) return;
            closed = true;
            input.close();
        }
    }

    static String sha256Base64Url(byte[] bytes) {
        MessageDigest digest = newSha256();
        digest.update(bytes);
        return base64Url(digest.digest());
    }

    static MessageDigest newSha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is unavailable.", error);
        }
    }

    static String base64Url(byte[] bytes) {
        final char[] alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".toCharArray();
        StringBuilder output = new StringBuilder((bytes.length * 4 + 2) / 3);
        for (int index = 0; index < bytes.length; index += 3) {
            int value = (bytes[index] & 0xff) << 16;
            boolean hasSecond = index + 1 < bytes.length;
            boolean hasThird = index + 2 < bytes.length;
            if (hasSecond) value |= (bytes[index + 1] & 0xff) << 8;
            if (hasThird) value |= bytes[index + 2] & 0xff;
            output.append(alphabet[(value >>> 18) & 0x3f]);
            output.append(alphabet[(value >>> 12) & 0x3f]);
            if (hasSecond) output.append(alphabet[(value >>> 6) & 0x3f]);
            if (hasThird) output.append(alphabet[value & 0x3f]);
        }
        return output.toString();
    }

    private static int parseBoundedInt(String raw, int minimum, int maximum, String label) throws IOException {
        long value = parseBoundedLong(raw, minimum, maximum, label);
        return (int) value;
    }

    private static long parseBoundedLong(String raw, long minimum, long maximum, String label) throws IOException {
        if (raw == null || !raw.matches("0|[1-9][0-9]*")) throw new IOException("Transfer " + label + " is invalid.");
        try {
            long value = Long.parseLong(raw);
            if (value < minimum || value > maximum) throw new IOException("Transfer " + label + " exceeds its limit.");
            return value;
        } catch (NumberFormatException error) {
            throw new IOException("Transfer " + label + " is invalid.", error);
        }
    }
}
