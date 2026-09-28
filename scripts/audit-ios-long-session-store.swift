import Foundation

@main
struct IOSLongSessionStoreAudit {
    static func main() {
        let suiteName = "ActorEmpire.IOSLongSessionStoreAudit"
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            fatalError("Could not create isolated defaults")
        }
        defaults.removePersistentDomain(forName: suiteName)
        var now: Int64 = 4_200_000_000_000
        var id = 0
        let store = IOSLongSessionDiagnosticsStore(
            defaults: defaults,
            nowMs: { now },
            makeId: { prefix in id += 1; return "\(prefix)-\(id)" }
        )

        store.beginNativeSession(
            appVersion: "1.0.25",
            buildNumber: "21",
            deviceModel: "iPhone",
            osVersion: "iOS 26.0"
        )
        store.recordCheckpoint([
            "checkpoint": "week_verified",
            "occurredAtMs": now,
            "age": 27,
            "week": 1,
            "saveSlot": 2,
            "screen": "HOME",
            "runtimeBytes": 26_721_695,
            "persistedBytes": 23_176_686,
            "worldProjects": 236,
            "rightsContracts": 102,
            "platformPlans": 180,
            "industryEvents": 520,
            "saveContent": "must be ignored"
        ])
        now += 1_000
        store.recordMemoryWarning()
        now += 1_000
        store.recordRendererTermination()

        var state = store.state()
        precondition(state["available"] as? Bool == true)
        precondition(state["reportPending"] as? Bool == true)
        precondition(state["previousTerminationKind"] as? String == "WEB_CONTENT_TERMINATED")
        precondition(state["memoryWarningCount"] as? Int == 1)
        precondition(state["rendererTerminationCount"] as? Int == 1)
        precondition(state["previousSessionAge"] as? Int == 27)
        precondition(state["previousSessionWeek"] as? Int == 1)
        precondition(state["previousSessionSaveSlot"] as? Int == 2)
        precondition(state["previousSessionScreen"] as? String == "HOME")
        precondition(state["previousRuntimeBytes"] as? Int == 26_721_695)
        precondition(state["previousPersistedBytes"] as? Int == 23_176_686)
        precondition(state["previousAppVersion"] as? String == "1.0.25")
        precondition(state["previousBuildNumber"] as? String == "21")
        precondition(state["previousDeviceModel"] as? String == "iPhone")
        precondition(state["previousOSVersion"] as? String == "iOS 26.0")
        precondition(state["saveContent"] == nil)

        let reportId = state["reportId"] as! String
        store.acknowledgeReport(reportId: "wrong-report")
        precondition(store.state()["reportPending"] as? Bool == true)
        store.acknowledgeReport(reportId: reportId)
        precondition(store.state()["reportPending"] as? Bool == false)
        precondition(store.state()["previousTerminationKind"] as? String == "NONE")
        precondition(store.state()["previousSessionScreen"] == nil)

        store.recordLifecycle("active")
        now += 1_000
        store.beginNativeSession(appVersion: "1.0.25", buildNumber: "21")
        state = store.state()
        precondition(state["reportPending"] as? Bool == true)
        precondition(state["previousTerminationKind"] as? String == "UNEXPECTED_ACTIVE_EXIT")
        precondition(state["launchCount"] as? Int == 2)

        print("iOS long-session native store audit passed.")
    }
}
