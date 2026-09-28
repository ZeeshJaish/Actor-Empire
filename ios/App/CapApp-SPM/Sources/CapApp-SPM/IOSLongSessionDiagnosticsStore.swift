import Foundation

public final class IOSLongSessionDiagnosticsStore {
    public static let shared = IOSLongSessionDiagnosticsStore()

    private enum Key {
        static let prefix = "actorEmpire.iosLongSession.v1."
        static let sessionId = prefix + "sessionId"
        static let sessionActive = prefix + "sessionActive"
        static let launchCount = prefix + "launchCount"
        static let lifecycle = prefix + "lifecycle"
        static let memoryWarnings = prefix + "memoryWarnings"
        static let rendererTerminations = prefix + "rendererTerminations"
        static let appVersion = prefix + "appVersion"
        static let buildNumber = prefix + "buildNumber"
        static let deviceModel = prefix + "deviceModel"
        static let osVersion = prefix + "osVersion"
        static let lastEventAtMs = prefix + "lastEventAtMs"
        static let checkpoint = prefix + "checkpoint"
        static let age = prefix + "age"
        static let week = prefix + "week"
        static let saveSlot = prefix + "saveSlot"
        static let screen = prefix + "screen"
        static let runtimeBytes = prefix + "runtimeBytes"
        static let persistedBytes = prefix + "persistedBytes"
        static let worldProjects = prefix + "worldProjects"
        static let rightsContracts = prefix + "rightsContracts"
        static let platformPlans = prefix + "platformPlans"
        static let industryEvents = prefix + "industryEvents"
        static let elapsedMs = prefix + "elapsedMs"
        static let reportPending = prefix + "reportPending"
        static let reportId = prefix + "reportId"
        static let reportTerminationKind = prefix + "reportTerminationKind"
        static let reportMemoryWarnings = prefix + "reportMemoryWarnings"
        static let reportRendererTerminations = prefix + "reportRendererTerminations"
        static let reportAge = prefix + "reportAge"
        static let reportWeek = prefix + "reportWeek"
        static let reportSaveSlot = prefix + "reportSaveSlot"
        static let reportScreen = prefix + "reportScreen"
        static let reportRuntimeBytes = prefix + "reportRuntimeBytes"
        static let reportPersistedBytes = prefix + "reportPersistedBytes"
        static let reportAppVersion = prefix + "reportAppVersion"
        static let reportBuildNumber = prefix + "reportBuildNumber"
        static let reportDeviceModel = prefix + "reportDeviceModel"
        static let reportOSVersion = prefix + "reportOSVersion"
    }

    private let defaults: UserDefaults
    private let nowMs: () -> Int64
    private let makeId: (String) -> String
    private let lock = NSLock()

    public init(
        defaults: UserDefaults = .standard,
        nowMs: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1_000) },
        makeId: @escaping (String) -> String = { prefix in "\(prefix)-\(UUID().uuidString.lowercased())" }
    ) {
        self.defaults = defaults
        self.nowMs = nowMs
        self.makeId = makeId
    }

    private func withLock<T>(_ operation: () -> T) -> T {
        lock.lock()
        defer { lock.unlock() }
        return operation()
    }

    private func boundedText(_ value: Any?, limit: Int = 80) -> String? {
        guard let text = value as? String else { return nil }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : String(trimmed.prefix(limit))
    }

    private func boundedInteger(_ value: Any?, min: Int = 0, max: Int = 2_000_000_000) -> Int? {
        let number: Double
        if let value = value as? NSNumber {
            number = value.doubleValue
        } else if let value = value as? Double {
            number = value
        } else if let value = value as? Int {
            number = Double(value)
        } else {
            return nil
        }
        guard number.isFinite else { return nil }
        return Swift.min(max, Swift.max(min, Int(number.rounded(.down))))
    }

    private func setOptional(_ value: Any?, forKey key: String) {
        if let value {
            defaults.set(value, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }

    private func copyCurrentSnapshotToReport() {
        setOptional(defaults.object(forKey: Key.age), forKey: Key.reportAge)
        setOptional(defaults.object(forKey: Key.week), forKey: Key.reportWeek)
        setOptional(defaults.object(forKey: Key.saveSlot), forKey: Key.reportSaveSlot)
        setOptional(defaults.object(forKey: Key.screen), forKey: Key.reportScreen)
        setOptional(defaults.object(forKey: Key.runtimeBytes), forKey: Key.reportRuntimeBytes)
        setOptional(defaults.object(forKey: Key.persistedBytes), forKey: Key.reportPersistedBytes)
        setOptional(defaults.object(forKey: Key.appVersion), forKey: Key.reportAppVersion)
        setOptional(defaults.object(forKey: Key.buildNumber), forKey: Key.reportBuildNumber)
        setOptional(defaults.object(forKey: Key.deviceModel), forKey: Key.reportDeviceModel)
        setOptional(defaults.object(forKey: Key.osVersion), forKey: Key.reportOSVersion)
        defaults.set(defaults.integer(forKey: Key.memoryWarnings), forKey: Key.reportMemoryWarnings)
        defaults.set(defaults.integer(forKey: Key.rendererTerminations), forKey: Key.reportRendererTerminations)
    }

    private func createPendingReport(kind: String) {
        defaults.set(true, forKey: Key.reportPending)
        defaults.set(makeId("report"), forKey: Key.reportId)
        defaults.set(kind, forKey: Key.reportTerminationKind)
        copyCurrentSnapshotToReport()
    }

    public func beginNativeSession(
        appVersion: String,
        buildNumber: String,
        deviceModel: String = "unknown",
        osVersion: String = "unknown"
    ) {
        withLock {
            let previousActive = defaults.bool(forKey: Key.sessionActive)
            let previousLifecycle = defaults.string(forKey: Key.lifecycle) ?? "unknown"
            if previousActive && !defaults.bool(forKey: Key.reportPending) {
                let kind: String
                switch previousLifecycle {
                case "backgrounded", "inactive":
                    kind = "BACKGROUND_TERMINATED"
                case "memory_warning":
                    kind = "MEMORY_PRESSURE_EXIT"
                case "terminated":
                    kind = "CLEAN"
                default:
                    kind = "UNEXPECTED_ACTIVE_EXIT"
                }
                if kind != "CLEAN" {
                    createPendingReport(kind: kind)
                }
            }

            defaults.set(defaults.integer(forKey: Key.launchCount) + 1, forKey: Key.launchCount)
            defaults.set(makeId("session"), forKey: Key.sessionId)
            defaults.set(true, forKey: Key.sessionActive)
            defaults.set("active", forKey: Key.lifecycle)
            defaults.set(0, forKey: Key.memoryWarnings)
            defaults.set(0, forKey: Key.rendererTerminations)
            defaults.set(String(appVersion.prefix(40)), forKey: Key.appVersion)
            defaults.set(String(buildNumber.prefix(40)), forKey: Key.buildNumber)
            defaults.set(String(deviceModel.prefix(80)), forKey: Key.deviceModel)
            defaults.set(String(osVersion.prefix(80)), forKey: Key.osVersion)
            defaults.set(nowMs(), forKey: Key.lastEventAtMs)
            defaults.synchronize()
        }
    }

    public func recordLifecycle(_ lifecycle: String) {
        withLock {
            let allowed = ["active", "inactive", "backgrounded", "terminated"]
            let safeLifecycle = allowed.contains(lifecycle) ? lifecycle : "unknown"
            defaults.set(safeLifecycle, forKey: Key.lifecycle)
            defaults.set(safeLifecycle != "terminated", forKey: Key.sessionActive)
            defaults.set(nowMs(), forKey: Key.lastEventAtMs)
            defaults.synchronize()
        }
    }

    public func recordMemoryWarning() {
        withLock {
            defaults.set(defaults.integer(forKey: Key.memoryWarnings) + 1, forKey: Key.memoryWarnings)
            defaults.set("memory_warning", forKey: Key.lifecycle)
            defaults.set(nowMs(), forKey: Key.lastEventAtMs)
            defaults.synchronize()
        }
    }

    public func recordRendererTermination() {
        withLock {
            defaults.set(defaults.integer(forKey: Key.rendererTerminations) + 1, forKey: Key.rendererTerminations)
            defaults.set("renderer_terminated", forKey: Key.lifecycle)
            defaults.set(nowMs(), forKey: Key.lastEventAtMs)
            createPendingReport(kind: "WEB_CONTENT_TERMINATED")
            defaults.synchronize()
        }
    }

    public func recordCheckpoint(_ payload: [String: Any]) {
        withLock {
            if let checkpoint = boundedText(payload["checkpoint"]) {
                defaults.set(checkpoint, forKey: Key.checkpoint)
                switch checkpoint {
                case "backgrounded", "page_hidden":
                    defaults.set("backgrounded", forKey: Key.lifecycle)
                case "runtime_ready", "foregrounded", "page_shown", "week_started",
                     "week_persistence_prepared", "week_verified", "week_failed":
                    defaults.set("active", forKey: Key.lifecycle)
                default:
                    break
                }
            }
            let mappings: [(String, String, Int, Int)] = [
                ("age", Key.age, 0, 150),
                ("week", Key.week, 1, 52),
                ("saveSlot", Key.saveSlot, 0, 20),
                ("runtimeBytes", Key.runtimeBytes, 0, 2_000_000_000),
                ("persistedBytes", Key.persistedBytes, 0, 2_000_000_000),
                ("worldProjects", Key.worldProjects, 0, 2_000_000_000),
                ("rightsContracts", Key.rightsContracts, 0, 2_000_000_000),
                ("platformPlans", Key.platformPlans, 0, 2_000_000_000),
                ("industryEvents", Key.industryEvents, 0, 2_000_000_000),
                ("elapsedMs", Key.elapsedMs, 0, 86_400_000),
            ]
            for (source, destination, min, max) in mappings {
                if let value = boundedInteger(payload[source], min: min, max: max) {
                    defaults.set(value, forKey: destination)
                }
            }
            if let screen = boundedText(payload["screen"]) {
                defaults.set(screen, forKey: Key.screen)
            }
            let occurredAtMs = boundedInteger(payload["occurredAtMs"], max: Int.max) ?? Int(nowMs())
            defaults.set(occurredAtMs, forKey: Key.lastEventAtMs)
            defaults.synchronize()
        }
    }

    public func acknowledgeReport(reportId: String) {
        withLock {
            guard defaults.bool(forKey: Key.reportPending),
                  defaults.string(forKey: Key.reportId) == reportId else { return }
            defaults.set(false, forKey: Key.reportPending)
            defaults.synchronize()
        }
    }

    public func state() -> [String: Any] {
        withLock {
            let reportPending = defaults.bool(forKey: Key.reportPending)
            var output: [String: Any] = [
                "available": true,
                "reportPending": reportPending,
                "launchCount": defaults.integer(forKey: Key.launchCount),
                "memoryWarningCount": reportPending
                    ? defaults.integer(forKey: Key.reportMemoryWarnings)
                    : defaults.integer(forKey: Key.memoryWarnings),
                "rendererTerminationCount": reportPending
                    ? defaults.integer(forKey: Key.reportRendererTerminations)
                    : defaults.integer(forKey: Key.rendererTerminations),
            ]
            if let sessionId = defaults.string(forKey: Key.sessionId) { output["sessionId"] = sessionId }
            if reportPending {
                if let reportId = defaults.string(forKey: Key.reportId) { output["reportId"] = reportId }
                if let kind = defaults.string(forKey: Key.reportTerminationKind) { output["previousTerminationKind"] = kind }
                let reportMappings: [(String, String)] = [
                    (Key.reportAge, "previousSessionAge"),
                    (Key.reportWeek, "previousSessionWeek"),
                    (Key.reportSaveSlot, "previousSessionSaveSlot"),
                    (Key.reportRuntimeBytes, "previousRuntimeBytes"),
                    (Key.reportPersistedBytes, "previousPersistedBytes"),
                ]
                for (source, destination) in reportMappings {
                    if defaults.object(forKey: source) != nil { output[destination] = defaults.integer(forKey: source) }
                }
                if let screen = defaults.string(forKey: Key.reportScreen) { output["previousSessionScreen"] = screen }
                if let appVersion = defaults.string(forKey: Key.reportAppVersion) { output["previousAppVersion"] = appVersion }
                if let buildNumber = defaults.string(forKey: Key.reportBuildNumber) { output["previousBuildNumber"] = buildNumber }
                if let deviceModel = defaults.string(forKey: Key.reportDeviceModel) { output["previousDeviceModel"] = deviceModel }
                if let osVersion = defaults.string(forKey: Key.reportOSVersion) { output["previousOSVersion"] = osVersion }
            } else {
                output["previousTerminationKind"] = "NONE"
            }
            return output
        }
    }
}
