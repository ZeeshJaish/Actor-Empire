import Foundation
import CryptoKit

@main
struct IOSSaveTransferSessionAudit {
    static func main() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("ae-ios-session-audit-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }

        let first = Data(repeating: 0x41, count: 260_000)
        let second = Data("{\"player\":\"test\"}".utf8)
        let export = try IOSSaveTransferExportSession(
            directory: directory,
            filename: "career.aesave"
        )

        try export.beginRecord(id: "save-1")
        var offset = 0
        while offset < first.count {
            let end = min(offset + 64 * 1024, first.count)
            let accepted = try export.appendRecordChunk(first.subdata(in: offset..<end))
            assert(accepted == end - offset)
            offset = end
        }
        let firstDigest = try export.finishRecord()
        assert(firstDigest.byteLength == Int64(first.count))
        assert(export.lastRecordID == "save-1")

        try export.beginRecord(id: "save-2")
        _ = try export.appendRecordChunk(second)
        let secondDigest = try export.finishRecord()
        let manifest = Data(("{\"format\":\"actor-empire-save-transfer\",\"formatVersion\":2,\"records\":["
            + "{\"id\":\"save-1\",\"byteLength\":\(first.count),\"sha256\":\"\(firstDigest.sha256)\"},"
            + "{\"id\":\"save-2\",\"byteLength\":\(second.count),\"sha256\":\"\(secondDigest.sha256)\"}]}"
        ).utf8)
        try export.beginManifest(byteLength: manifest.count)
        _ = try export.appendManifestChunk(manifest)
        let finalized = try export.finalize()
        assert(finalized.byteLength > Int64(first.count + second.count))
        assert(FileManager.default.fileExists(atPath: export.fileURL.path))

        let reader = try IOSSaveTransferFraming.Reader(url: export.fileURL)
        let readManifest = try reader.readManifest()
        assert(readManifest == manifest)
        for (id, expected) in [("save-1", first), ("save-2", second)] {
            let header = try reader.beginRecord()
            let descriptor = try JSONSerialization.jsonObject(with: header.header) as! [String: Any]
            assert(descriptor["id"] as? String == id)
            assert(descriptor["byteLength"] as? Int == expected.count)
            assert((descriptor["sha256"] as? String)?.isEmpty == false)
            var actual = Data()
            while true {
                let chunk = try reader.readChunk(maxBytes: 32 * 1024)
                if chunk.isEmpty { break }
                actual.append(chunk)
            }
            assert(actual == expected)
            _ = try reader.finishRecord()
        }
        try reader.finish()

        let imported = try IOSSaveTransferImportSession(fileURL: export.fileURL)
        assert(imported.formatVersion == 2)
        let manifestLength = try imported.prepareManifest()
        assert(manifestLength == manifest.count)
        var streamedManifest = Data()
        while true {
            let part = try imported.readManifestChunk(maxBytes: 7)
            if part.isEmpty { break }
            streamedManifest.append(part)
        }
        assert(streamedManifest == manifest)
        for (id, expected) in [("save-1", first), ("save-2", second)] {
            let header = try imported.beginRecord()
            let descriptor = try JSONSerialization.jsonObject(with: header.header) as! [String: Any]
            assert(descriptor["id"] as? String == id)
            assert(descriptor["byteLength"] as? Int == expected.count)
            assert((descriptor["sha256"] as? String)?.isEmpty == false)
            var actual = Data()
            while true {
                let part = try imported.readRecordChunk(maxBytes: 16 * 1024)
                if part.isEmpty { break }
                actual.append(part)
            }
            assert(actual == expected)
            _ = try imported.finishRecord()
        }
        let importResult = try imported.finish()
        assert(importResult.recordCount == 2)
        assert(importResult.recordBytes == Int64(first.count + second.count))

        let legacyURL = directory.appendingPathComponent("older-v1.aesave")
        let legacyBytes = Data("{\"formatVersion\":1}".utf8)
        try legacyBytes.write(to: legacyURL)
        let legacy = try IOSSaveTransferImportSession(fileURL: legacyURL)
        assert(legacy.formatVersion == 1)
        var recoveredLegacy = Data()
        while true {
            let part = try legacy.readLegacyChunk(maxBytes: 7)
            if part.isEmpty { break }
            recoveredLegacy.append(part)
        }
        assert(recoveredLegacy == legacyBytes)
        let legacyResult = try legacy.finish()
        assert(legacyResult.recordBytes == Int64(legacyBytes.count))

        let invalid = try IOSSaveTransferExportSession(directory: directory, filename: "invalid.aesave")
        try invalid.beginRecord(id: "save-1")
        _ = try invalid.appendRecordChunk(second)
        let validDigest = try invalid.finishRecord()
        let wrongManifest = Data(("{\"format\":\"actor-empire-save-transfer\",\"formatVersion\":2,\"records\":["
            + "{\"id\":\"save-1\",\"byteLength\":\(second.count),\"sha256\":\"\(String(repeating: "0", count: validDigest.sha256.count))\"}]}"
        ).utf8)
        try invalid.beginManifest(byteLength: wrongManifest.count)
        _ = try invalid.appendManifestChunk(wrongManifest)
        do {
            _ = try invalid.finalize()
            fatalError("A record with a changed digest was exported")
        } catch { }
        assert(!FileManager.default.fileExists(atPath: invalid.fileURL.path))
        invalid.cancel()

        let cancelled = try IOSSaveTransferExportSession(
            directory: directory,
            filename: "cancelled.aesave"
        )
        try cancelled.beginRecord(id: "save-1")
        _ = try cancelled.appendRecordChunk(Data(repeating: 0x7f, count: 128))
        let workingURL = cancelled.workingDirectory
        cancelled.cancel()
        assert(!FileManager.default.fileExists(atPath: workingURL.path))
        assert(!FileManager.default.fileExists(atPath: cancelled.fileURL.path))

        let existingURL = directory.appendingPathComponent("existing.aesave")
        let existingBytes = Data("keep this earlier export".utf8)
        try existingBytes.write(to: existingURL)
        let conflicting = try IOSSaveTransferExportSession(directory: directory, filename: "existing.aesave")
        try conflicting.beginRecord(id: "save-1")
        _ = try conflicting.appendRecordChunk(second)
        let conflictingDigest = try conflicting.finishRecord()
        let conflictingManifest = Data(("{\"format\":\"actor-empire-save-transfer\",\"formatVersion\":2,\"records\":["
            + "{\"id\":\"save-1\",\"byteLength\":\(second.count),\"sha256\":\"\(conflictingDigest.sha256)\"}]}"
        ).utf8)
        try conflicting.beginManifest(byteLength: conflictingManifest.count)
        _ = try conflicting.appendManifestChunk(conflictingManifest)
        do {
            _ = try conflicting.finalize()
            fatalError("An existing export file was overwritten")
        } catch { }
        conflicting.cancel()
        let preservedBytes = try Data(contentsOf: existingURL)
        assert(preservedBytes == existingBytes,
               "Cancelling a failed export must not delete an earlier file")

        print("iOS save transfer session audit passed.")
    }
}
