import Foundation
import CryptoKit

public enum IOSSaveTransferFraming {
    public static let maxChunkBytes = 128 * 1024
    public static let maxManifestBytes = 512 * 1024
    public static let maxRecordBytes: Int64 = 128 * 1024 * 1024
    public static let maxTotalRecordBytes: Int64 = 512 * 1024 * 1024
    public static let maxRecords = 643

    public struct DigestResult {
        public let byteLength: Int64
        public let sha256: String
    }

    public struct RecordHeader {
        public let header: Data
        public let byteLength: Int64
    }

    public enum FramingError: Error {
        case invalid(String)
    }

    private static func digest(_ hash: SHA256.Digest) -> String {
        Data(hash).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func ascii(_ value: String) -> Data { Data(value.utf8) }

    public static func write(
        manifest: Data,
        records: [(header: Data, fileURL: URL)],
        destination: URL
    ) throws -> DigestResult {
        guard !manifest.isEmpty, manifest.count <= maxManifestBytes else {
            throw FramingError.invalid("Manifest exceeds its byte limit.")
        }
        guard !records.isEmpty, records.count <= maxRecords else {
            throw FramingError.invalid("Record count exceeds its limit.")
        }
        guard !FileManager.default.fileExists(atPath: destination.path) else {
            throw FramingError.invalid("Destination file already exists.")
        }
        let partial = destination.deletingLastPathComponent()
            .appendingPathComponent("\(destination.lastPathComponent).\(UUID().uuidString).part")
        guard FileManager.default.createFile(atPath: partial.path, contents: nil) else {
            throw FramingError.invalid("Could not create transfer file.")
        }
        do {
            let output = try FileHandle(forWritingTo: partial)
            defer { try? output.close() }
            var archiveHash = SHA256()
            var archiveBytes: Int64 = 0
            func append(_ data: Data) throws {
                try output.write(contentsOf: data)
                archiveHash.update(data: data)
                archiveBytes += Int64(data.count)
            }
            try append(ascii("AESAVE2\n\(manifest.count)\n"))
            try append(manifest)
            try append(ascii("\n"))
            var totalRecordBytes: Int64 = 0
            for record in records {
                guard !record.header.isEmpty, record.header.count <= 16 * 1024 else {
                    throw FramingError.invalid("Record header exceeds its byte limit.")
                }
                let attributes = try FileManager.default.attributesOfItem(atPath: record.fileURL.path)
                let length = (attributes[.size] as? NSNumber)?.int64Value ?? -1
                guard length >= 0, length <= maxRecordBytes,
                    totalRecordBytes + length <= maxTotalRecordBytes else {
                    throw FramingError.invalid("Record exceeds its byte limit.")
                }
                totalRecordBytes += length
                try append(ascii("RECORD\n\(record.header.count)\n"))
                try append(record.header)
                try append(ascii("\n\(length)\n"))
                let source = try FileHandle(forReadingFrom: record.fileURL)
                defer { try? source.close() }
                var copied: Int64 = 0
                while copied < length {
                    let requested = Int(min(Int64(64 * 1024), length - copied))
                    guard let part = try source.read(upToCount: requested), !part.isEmpty else {
                        throw FramingError.invalid("Record ended before its declared length.")
                    }
                    copied += Int64(part.count)
                    try append(part)
                }
            }
            try output.synchronize()
            try output.close()
            try FileManager.default.moveItem(at: partial, to: destination)
            return DigestResult(byteLength: archiveBytes, sha256: digest(archiveHash.finalize()))
        } catch {
            try? FileManager.default.removeItem(at: partial)
            throw error
        }
    }

    public final class Reader {
        private let input: FileHandle
        private var manifestRead = false
        private var recordRemaining: Int64?
        private var recordLength: Int64 = 0
        private var recordHash = SHA256()
        private var recordCount = 0
        private var totalRecordBytes: Int64 = 0
        private var closed = false

        public init(url: URL) throws {
            input = try FileHandle(forReadingFrom: url)
        }

        deinit { try? input.close() }

        private func readExact(_ count: Int) throws -> Data {
            var result = Data()
            while result.count < count {
                guard let part = try input.read(upToCount: count - result.count), !part.isEmpty else {
                    throw FramingError.invalid("Transfer ended unexpectedly.")
                }
                result.append(part)
            }
            return result
        }

        private func line(maxBytes: Int) throws -> String {
            var bytes = Data()
            while true {
                let next = try readExact(1)
                if next[0] == 10 { break }
                guard bytes.count < maxBytes, next[0] != 13 else {
                    throw FramingError.invalid("Transfer framing line exceeds its limit.")
                }
                bytes.append(next)
            }
            guard let value = String(data: bytes, encoding: .ascii) else {
                throw FramingError.invalid("Transfer framing line is invalid.")
            }
            return value
        }

        private func boundedLength(_ raw: String, minimum: Int64, maximum: Int64) throws -> Int64 {
            guard !raw.isEmpty, raw == "0" || (raw.first != "0" && raw.allSatisfy(\.isNumber)),
                let value = Int64(raw), value >= minimum, value <= maximum else {
                throw FramingError.invalid("Transfer length is invalid or exceeds its limit.")
            }
            return value
        }

        private func newline() throws {
            guard try readExact(1)[0] == 10 else {
                throw FramingError.invalid("Transfer framing newline is missing.")
            }
        }

        public func readManifest() throws -> Data {
            guard !closed, !manifestRead, try line(maxBytes: 16) == "AESAVE2" else {
                throw FramingError.invalid("Transfer is not a V2 framed archive.")
            }
            let length = try boundedLength(line(maxBytes: 24), minimum: 1, maximum: Int64(maxManifestBytes))
            let manifest = try readExact(Int(length))
            try newline()
            manifestRead = true
            return manifest
        }

        public func beginRecord() throws -> RecordHeader {
            guard !closed, manifestRead, recordRemaining == nil, recordCount < maxRecords,
                try line(maxBytes: 16) == "RECORD" else {
                throw FramingError.invalid("Transfer record marker is invalid.")
            }
            let headerLength = try boundedLength(line(maxBytes: 24), minimum: 2, maximum: 16 * 1024)
            let header = try readExact(Int(headerLength))
            try newline()
            let length = try boundedLength(line(maxBytes: 32), minimum: 0, maximum: maxRecordBytes)
            guard totalRecordBytes + length <= maxTotalRecordBytes else {
                throw FramingError.invalid("Transfer exceeds its total byte limit.")
            }
            totalRecordBytes += length
            recordCount += 1
            recordRemaining = length
            recordLength = length
            recordHash = SHA256()
            return RecordHeader(header: header, byteLength: length)
        }

        public func readChunk(maxBytes: Int) throws -> Data {
            guard !closed, let remaining = recordRemaining, maxBytes > 0,
                maxBytes <= IOSSaveTransferFraming.maxChunkBytes else {
                throw FramingError.invalid("Transfer chunk request is invalid.")
            }
            if remaining == 0 { return Data() }
            let chunk = try readExact(Int(min(Int64(maxBytes), remaining)))
            recordHash.update(data: chunk)
            recordRemaining = remaining - Int64(chunk.count)
            return chunk
        }

        public func finishRecord() throws -> DigestResult {
            guard !closed, recordRemaining == 0 else {
                throw FramingError.invalid("Transfer record ended before its declared length.")
            }
            recordRemaining = nil
            return DigestResult(byteLength: recordLength, sha256: IOSSaveTransferFraming.digest(recordHash.finalize()))
        }

        public func finish() throws {
            guard !closed, manifestRead, recordRemaining == nil,
                try (input.read(upToCount: 1) ?? Data()).isEmpty else {
                throw FramingError.invalid("Transfer has unexpected trailing data.")
            }
            closed = true
            try input.close()
        }

        public func cancel() {
            if !closed { try? input.close() }
            closed = true
        }
    }
}
