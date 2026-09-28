import Foundation

@main
struct IOSRendererRecoveryStateAudit {
    static func main() {
        var state = IOSRendererRecoveryState()
        precondition(state.phase == .idle)
        precondition(state.terminated() == .showRecovery)
        precondition(state.phase == .reloading)
        precondition(state.terminated() == .none, "duplicate termination callbacks must not stack reloads")
        precondition(state.navigationFailed() == .showRetry)
        precondition(state.phase == .waitingForRetry)
        precondition(state.retry() == .reload)
        precondition(state.phase == .reloading)
        precondition(state.startupReady() == .hideRecovery)
        precondition(state.phase == .idle)
        precondition(state.retry() == .none)
        let center = NotificationCenter()
        var readyCount = 0
        let observer = center.addObserver(forName: .actorEmpireIOSStartupReady, object: nil, queue: nil) { _ in
            readyCount += 1
        }
        IOSRendererRecoveryEvents.publishCheckpoint("runtime_ready", on: center)
        precondition(readyCount == 0, "mounting alone must not hide recovery")
        IOSRendererRecoveryEvents.publishCheckpoint("startup_ready", on: center)
        precondition(readyCount == 1, "a fully loaded shell must release the native recovery surface")
        center.removeObserver(observer)
        print("iOS renderer recovery state audit passed.")
    }
}
