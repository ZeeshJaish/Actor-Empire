package com.zeeshapps.actorempire;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import org.junit.Test;

public class SaveTransferStreamSessionTest {
    @Test
    public void exportRecordRejectsOversizedChunksAndDeletesPartialDataOnCancel() throws Exception {
        File root = Files.createTempDirectory("ae-transfer-export").toFile();
        SaveTransferStreamSession.ExportRecord record = new SaveTransferStreamSession.ExportRecord(
            root,
            "save-slot-1",
            8
        );
        record.append(new byte[] { 1, 2, 3 });
        assertEquals(3L, record.getByteLength());
        boolean rejected = false;
        try {
            record.append(new byte[9]);
        } catch (IllegalArgumentException expected) {
            rejected = true;
        }
        assertTrue(rejected);
        File partial = record.getFile();
        assertTrue(partial.exists());
        record.cancel();
        assertFalse(partial.exists());
    }

    @Test
    public void importReaderStreamsOneRecordAndDetectsTruncation() throws Exception {
        byte[] payload = "career-data".getBytes(StandardCharsets.UTF_8);
        String manifest = "{\"format\":\"actor-empire-save-transfer\",\"formatVersion\":2}";
        String header = "{\"id\":\"save-slot-1\",\"kind\":\"SAVE\",\"byteLength\":" + payload.length + "}";
        ByteArrayOutputStream archive = new ByteArrayOutputStream();
        archive.write(("AESAVE2\n" + manifest.getBytes(StandardCharsets.UTF_8).length + "\n" + manifest + "\n").getBytes(StandardCharsets.UTF_8));
        archive.write(("RECORD\n" + header.getBytes(StandardCharsets.UTF_8).length + "\n" + header + "\n" + payload.length + "\n").getBytes(StandardCharsets.UTF_8));
        archive.write(payload);

        SaveTransferStreamSession.ImportReader reader = new SaveTransferStreamSession.ImportReader(
            new ByteArrayInputStream(archive.toByteArray())
        );
        assertEquals(manifest, reader.readManifest());
        SaveTransferStreamSession.RecordHeader parsed = reader.beginRecord();
        assertEquals(header, parsed.headerJson);
        assertEquals(payload.length, parsed.byteLength);
        byte[] first = reader.readRecordChunk(4);
        byte[] second = reader.readRecordChunk(128);
        ByteArrayOutputStream restored = new ByteArrayOutputStream();
        restored.write(first);
        restored.write(second);
        assertArrayEquals(payload, restored.toByteArray());
        assertEquals(SaveTransferStreamSession.sha256Base64Url(payload), reader.finishRecord().sha256);
        reader.finishArchive();

        byte[] truncated = java.util.Arrays.copyOf(archive.toByteArray(), archive.size() - 1);
        SaveTransferStreamSession.ImportReader broken = new SaveTransferStreamSession.ImportReader(
            new ByteArrayInputStream(truncated)
        );
        broken.readManifest();
        broken.beginRecord();
        boolean truncationRejected = false;
        try {
            while (broken.readRecordChunk(4).length > 0) {
                // Drain until the strict reader detects EOF before the declared length.
            }
        } catch (Exception expected) {
            truncationRejected = true;
        }
        assertTrue(truncationRejected);
    }
}
