import Foundation

public extension Notification.Name {
    static let actorEmpireIOSStartupReady = Notification.Name("actorEmpire.iosStartupReady")
}

public enum IOSRendererRecoveryEvents {
    public static func publishCheckpoint(_ checkpoint: String, on center: NotificationCenter = .default) {
        guard checkpoint == "startup_ready" else { return }
        center.post(name: .actorEmpireIOSStartupReady, object: nil)
    }
}

public struct IOSRendererRecoveryState {
    public enum Phase: Equatable { case idle, reloading, waitingForRetry }
    public enum Action: Equatable { case none, showRecovery, showRetry, reload, hideRecovery }

    public private(set) var phase: Phase = .idle

    public init() {}

    public mutating func terminated() -> Action {
        guard phase == .idle else { return .none }
        phase = .reloading
        return .showRecovery
    }

    public mutating func navigationFailed() -> Action {
        guard phase == .reloading else { return .none }
        phase = .waitingForRetry
        return .showRetry
    }

    public mutating func retry() -> Action {
        guard phase == .waitingForRetry else { return .none }
        phase = .reloading
        return .reload
    }

    public mutating func startupReady() -> Action {
        guard phase != .idle else { return .none }
        phase = .idle
        return .hideRecovery
    }
}
