import Foundation
import CryptoKit

/// Bounded, file-backed export staging. No save record is assembled in memory.
public final class IOSSaveTransferExportSession {
    private struct StagedRecord {
        let id: String
        let fileURL: URL
        let byteLength: Int64
        let sha256: String
    }

    public let workingDirectory: URL
    public let fileURL: URL
    public private(set) var lastRecordID: String?

    private var records: [StagedRecord] = []
    private var recordHandle: FileHandle?
    private var currentRecordURL: URL?
    private var currentRecordID: String?
    private var currentRecordBytes: Int64 = 0
    private var currentRecordHash = SHA256()
    private var totalRecordBytes: Int64 = 0
    private var expectedManifestBytes: Int?
    private var manifest = Data()
    private var finalized = false
    private var cancelled = false
    private var outputOwned = false

    public init(directory: URL, filename: String) throws {
        guard directory.isFileURL,
              filename.range(of: #"^[A-Za-z0-9][A-Za-z0-9._-]{0,179}\.aesave$"#, options: .regularExpression) != nil,
              filename != ".aesave" else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer filename is invalid.")
        }
        workingDirectory = directory.appendingPathComponent("export-\(UUID().uuidString)", isDirectory: true)
        fileURL = directory.appendingPathComponent(filename)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: workingDirectory, withIntermediateDirectories: false)
    }

    deinit {
        if !finalized { cancel() }
    }

    private func requireOpen() throws {
        guard !finalized, !cancelled else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer session is closed.")
        }
    }

    public func beginRecord(id: String) throws {
        try requireOpen()
        guard recordHandle == nil, expectedManifestBytes == nil,
              records.count < IOSSaveTransferFraming.maxRecords,
              id.range(of: #"^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$"#, options: .regularExpression) != nil,
              !records.contains(where: { $0.id == id }) else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer record id or order is invalid.")
        }
        let url = workingDirectory.appendingPathComponent("record-\(records.count).bin")
        guard FileManager.default.createFile(atPath: url.path, contents: nil) else {
            throw IOSSaveTransferFraming.FramingError.invalid("Could not stage transfer record.")
        }
        recordHandle = try FileHandle(forWritingTo: url)
        currentRecordURL = url
        currentRecordID = id
        currentRecordBytes = 0
        currentRecordHash = SHA256()
    }

    @discardableResult
    public func appendRecordChunk(_ bytes: Data) throws -> Int {
        try requireOpen()
        guard let recordHandle, !bytes.isEmpty,
              bytes.count <= IOSSaveTransferFraming.maxChunkBytes,
              currentRecordBytes + Int64(bytes.count) <= IOSSaveTransferFraming.maxRecordBytes,
              totalRecordBytes + Int64(bytes.count) <= IOSSaveTransferFraming.maxTotalRecordBytes else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer record chunk exceeds its limit.")
        }
        try recordHandle.write(contentsOf: bytes)
        currentRecordHash.update(data: bytes)
        currentRecordBytes += Int64(bytes.count)
        totalRecordBytes += Int64(bytes.count)
        return bytes.count
    }

    public func finishRecord() throws -> IOSSaveTransferFraming.DigestResult {
        try requireOpen()
        guard let recordHandle, let url = currentRecordURL, let id = currentRecordID else {
            throw IOSSaveTransferFraming.FramingError.invalid("No transfer record is open.")
        }
        try recordHandle.synchronize()
        try recordHandle.close()
        self.recordHandle = nil
        currentRecordURL = nil
        currentRecordID = nil
        let digest = Data(currentRecordHash.finalize()).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        let result = IOSSaveTransferFraming.DigestResult(byteLength: currentRecordBytes, sha256: digest)
        records.append(StagedRecord(id: id, fileURL: url, byteLength: currentRecordBytes, sha256: digest))
        lastRecordID = id
        return result
    }

    public func beginManifest(byteLength: Int) throws {
        try requireOpen()
        guard recordHandle == nil, !records.isEmpty, expectedManifestBytes == nil,
              byteLength > 0, byteLength <= IOSSaveTransferFraming.maxManifestBytes else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer manifest length is invalid.")
        }
        expectedManifestBytes = byteLength
    }

    @discardableResult
    public func appendManifestChunk(_ bytes: Data) throws -> Int {
        try requireOpen()
        guard let expectedManifestBytes, !bytes.isEmpty,
              bytes.count <= IOSSaveTransferFraming.maxChunkBytes,
              manifest.count + bytes.count <= expectedManifestBytes else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer manifest chunk exceeds its limit.")
        }
        manifest.append(bytes)
        return bytes.count
    }

    public func finalize() throws -> IOSSaveTransferFraming.DigestResult {
        try requireOpen()
        guard recordHandle == nil, expectedManifestBytes == manifest.count else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer manifest is incomplete.")
        }
        guard let body = try JSONSerialization.jsonObject(with: manifest) as? [String: Any],
              body["format"] as? String == "actor-empire-save-transfer",
              body["formatVersion"] as? Int == 2,
              let descriptors = body["records"] as? [[String: Any]],
              descriptors.count == records.count else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer manifest does not match staged records.")
        }
        let indexedRecords = Dictionary(uniqueKeysWithValues: records.map { ($0.id, $0) })
        var seen = Set<String>()
        let ordered: [(header: Data, fileURL: URL)] = try descriptors.map { descriptor in
            guard let id = descriptor["id"] as? String,
                  let record = indexedRecords[id], !seen.contains(id),
                  let length = descriptor["byteLength"] as? NSNumber,
                  length.int64Value == record.byteLength,
                  descriptor["sha256"] as? String == record.sha256 else {
                throw IOSSaveTransferFraming.FramingError.invalid("Transfer record does not match its manifest descriptor.")
            }
            seen.insert(id)
            return (header: try JSONSerialization.data(withJSONObject: descriptor, options: [.sortedKeys]),
                    fileURL: record.fileURL)
        }
        let result = try IOSSaveTransferFraming.write(
            manifest: manifest,
            records: ordered,
            destination: fileURL
        )
        outputOwned = true
        try FileManager.default.removeItem(at: workingDirectory)
        finalized = true
        return result
    }

    public func cancel() {
        if cancelled { return }
        try? recordHandle?.close()
        recordHandle = nil
        try? FileManager.default.removeItem(at: workingDirectory)
        if outputOwned { try? FileManager.default.removeItem(at: fileURL) }
        cancelled = true
    }
}

/// Streams a selected file without materializing a V2 archive in WebKit or Swift.
public final class IOSSaveTransferImportSession {
    public struct Completion {
        public let recordCount: Int
        public let recordBytes: Int64
    }

    public let formatVersion: Int
    public let totalBytes: Int64

    private var reader: IOSSaveTransferFraming.Reader?
    private var legacyHandle: FileHandle?
    private var manifest: Data?
    private var manifestOffset = 0
    private var recordOpen = false
    private var recordCount = 0
    private var recordBytes: Int64 = 0
    private var legacyBytes: Int64 = 0
    private var closed = false
    private let maxLegacyBytes: Int64 = 8 * 1024 * 1024

    public init(fileURL: URL) throws {
        guard fileURL.isFileURL else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer source is not a file.")
        }
        let attributes = try FileManager.default.attributesOfItem(atPath: fileURL.path)
        totalBytes = (attributes[.size] as? NSNumber)?.int64Value ?? -1
        guard totalBytes > 0,
              totalBytes <= IOSSaveTransferFraming.maxTotalRecordBytes + 8 * 1024 * 1024 else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer file exceeds its limit.")
        }
        let probe = try FileHandle(forReadingFrom: fileURL)
        let prefix = try probe.read(upToCount: 8) ?? Data()
        try probe.close()
        if prefix == Data("AESAVE2\n".utf8) {
            formatVersion = 2
            reader = try IOSSaveTransferFraming.Reader(url: fileURL)
        } else {
            guard totalBytes <= maxLegacyBytes else {
                throw IOSSaveTransferFraming.FramingError.invalid("Legacy transfer file exceeds its limit.")
            }
            formatVersion = 1
            legacyHandle = try FileHandle(forReadingFrom: fileURL)
        }
    }

    deinit { cancel() }

    private func requireV2() throws -> IOSSaveTransferFraming.Reader {
        guard !closed, let reader else {
            throw IOSSaveTransferFraming.FramingError.invalid("A V2 transfer session is required.")
        }
        return reader
    }

    public func prepareManifest() throws -> Int {
        let reader = try requireV2()
        guard manifest == nil else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer manifest was already prepared.")
        }
        manifest = try reader.readManifest()
        return manifest!.count
    }

    public func readManifestChunk(maxBytes: Int) throws -> Data {
        _ = try requireV2()
        guard let manifest, maxBytes > 0, maxBytes <= IOSSaveTransferFraming.maxChunkBytes else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer manifest request is invalid.")
        }
        if manifestOffset == manifest.count { return Data() }
        let end = min(manifestOffset + maxBytes, manifest.count)
        let part = manifest.subdata(in: manifestOffset..<end)
        manifestOffset = end
        return part
    }

    public func beginRecord() throws -> IOSSaveTransferFraming.RecordHeader {
        let reader = try requireV2()
        guard let manifest, manifestOffset == manifest.count, !recordOpen else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer record order is invalid.")
        }
        recordOpen = true
        do { return try reader.beginRecord() }
        catch {
            recordOpen = false
            throw error
        }
    }

    public func readRecordChunk(maxBytes: Int) throws -> Data {
        let reader = try requireV2()
        guard recordOpen else {
            throw IOSSaveTransferFraming.FramingError.invalid("No transfer record is open.")
        }
        return try reader.readChunk(maxBytes: maxBytes)
    }

    public func finishRecord() throws -> IOSSaveTransferFraming.DigestResult {
        let reader = try requireV2()
        guard recordOpen else {
            throw IOSSaveTransferFraming.FramingError.invalid("No transfer record is open.")
        }
        let result = try reader.finishRecord()
        recordOpen = false
        recordCount += 1
        recordBytes += result.byteLength
        return result
    }

    public func readLegacyChunk(maxBytes: Int) throws -> Data {
        guard !closed, formatVersion == 1, let legacyHandle,
              maxBytes > 0, maxBytes <= IOSSaveTransferFraming.maxChunkBytes else {
            throw IOSSaveTransferFraming.FramingError.invalid("Legacy transfer chunk request is invalid.")
        }
        let data = try legacyHandle.read(upToCount: maxBytes) ?? Data()
        legacyBytes += Int64(data.count)
        guard legacyBytes <= maxLegacyBytes else {
            throw IOSSaveTransferFraming.FramingError.invalid("Legacy transfer exceeds its limit.")
        }
        return data
    }

    public func finish() throws -> Completion {
        guard !closed, !recordOpen else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer session is incomplete.")
        }
        if formatVersion == 2 {
            guard manifest != nil, recordCount > 0 else {
                throw IOSSaveTransferFraming.FramingError.invalid("Transfer manifest or records are missing.")
            }
            try reader?.finish()
        } else {
            guard legacyBytes == totalBytes else {
                throw IOSSaveTransferFraming.FramingError.invalid("Legacy transfer was not fully read.")
            }
            try legacyHandle?.close()
        }
        closed = true
        return Completion(recordCount: recordCount, recordBytes: formatVersion == 2 ? recordBytes : legacyBytes)
    }

    public func cancel() {
        if closed { return }
        reader?.cancel()
        try? legacyHandle?.close()
        closed = true
    }
}
