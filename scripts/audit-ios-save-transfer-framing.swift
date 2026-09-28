import Foundation
import CryptoKit

@main
struct IOSSaveTransferFramingAudit {
static func main() throws {
let folder = FileManager.default.temporaryDirectory.appendingPathComponent("ae-ios-transfer-audit-\(UUID().uuidString)", isDirectory: true)
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: folder) }

let recordURL = folder.appendingPathComponent("record.bin")
let bytes = Data(repeating: 0x4a, count: 260_000)
try bytes.write(to: recordURL)
let header = Data("{\"id\":\"save-1\"}".utf8)
let manifest = Data("{\"formatVersion\":2}".utf8)
let archiveURL = folder.appendingPathComponent("archive.aesave")
let result = try IOSSaveTransferFraming.write(
    manifest: manifest,
    records: [(header: header, fileURL: recordURL)],
    destination: archiveURL
)
assert(result.byteLength > Int64(bytes.count))
let reader = try IOSSaveTransferFraming.Reader(url: archiveURL)
let readManifest = try reader.readManifest()
assert(readManifest == manifest)
let record = try reader.beginRecord()
assert(record.header == header)
assert(record.byteLength == Int64(bytes.count))
var recovered = Data()
while true {
    let part = try reader.readChunk(maxBytes: 7_000)
    if part.isEmpty { break }
    assert(part.count <= 7_000)
    recovered.append(part)
}
assert(recovered == bytes)
let digest = try reader.finishRecord()
let expectedDigest = Data(SHA256.hash(data: bytes)).base64EncodedString()
    .replacingOccurrences(of: "+", with: "-")
    .replacingOccurrences(of: "/", with: "_")
    .replacingOccurrences(of: "=", with: "")
assert(digest.sha256 == expectedDigest)
try reader.finish()

let truncatedURL = folder.appendingPathComponent("truncated.aesave")
try Data("AESAVE2\n20\n{}".utf8).write(to: truncatedURL)
let truncatedReader = try IOSSaveTransferFraming.Reader(url: truncatedURL)
do {
    _ = try truncatedReader.readManifest()
    fatalError("Truncated manifest was accepted")
} catch { }

print("iOS save transfer framing audit passed.")
}
}
