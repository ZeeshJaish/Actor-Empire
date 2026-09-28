import UIKit
import WebKit
import Capacitor
import CapApp_SPM

private final class IOSLongSessionNavigationDelegate: NSObject, WKNavigationDelegate {
    private weak var forwardedDelegate: (any WKNavigationDelegate)?
    private let onRendererTermination: () -> Void
    private let onNavigationFailure: () -> Void

    init(
        forwarding delegate: any WKNavigationDelegate,
        onRendererTermination: @escaping () -> Void,
        onNavigationFailure: @escaping () -> Void
    ) {
        self.forwardedDelegate = delegate
        self.onRendererTermination = onRendererTermination
        self.onNavigationFailure = onNavigationFailure
        super.init()
    }

    override func responds(to selector: Selector!) -> Bool {
        super.responds(to: selector)
            || (forwardedDelegate as? NSObject)?.responds(to: selector) == true
    }

    override func forwardingTarget(for selector: Selector!) -> Any? {
        if (forwardedDelegate as? NSObject)?.responds(to: selector) == true {
            return forwardedDelegate
        }
        return super.forwardingTarget(for: selector)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        IOSLongSessionDiagnosticsStore.shared.recordRendererTermination()
        onRendererTermination()
        if let forwardedDelegate {
            forwardedDelegate.webViewWebContentProcessDidTerminate?(webView)
        } else {
            webView.reload()
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        onNavigationFailure()
        forwardedDelegate?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        onNavigationFailure()
        forwardedDelegate?.webView?(webView, didFail: navigation, withError: error)
    }
}

class ViewController: CAPBridgeViewController {
    private var longSessionNavigationDelegate: IOSLongSessionNavigationDelegate?
    private var recoveryState = IOSRendererRecoveryState()
    private var recoveryOverlay: UIView?
    private var recoveryMessage: UILabel?
    private var recoveryRetryButton: UIButton?
    private var recoveryTimeout: DispatchWorkItem?

    private func showRendererRecovery() {
        guard recoveryOverlay == nil else { return }
        let overlay = UIView()
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.backgroundColor = UIColor(red: 0.035, green: 0.035, blue: 0.07, alpha: 1)

        let title = UILabel()
        title.text = "Actor Empire"
        title.textColor = .white
        title.font = .boldSystemFont(ofSize: 26)
        title.textAlignment = .center

        let message = UILabel()
        message.text = "Restoring your game from the last verified save…"
        message.textColor = .white
        message.font = .systemFont(ofSize: 16)
        message.textAlignment = .center
        message.numberOfLines = 0
        recoveryMessage = message

        let activity = UIActivityIndicatorView(style: .large)
        activity.color = .white
        activity.startAnimating()

        let retry = UIButton(type: .system)
        retry.setTitle("Retry loading", for: .normal)
        retry.setTitleColor(.white, for: .normal)
        retry.titleLabel?.font = .boldSystemFont(ofSize: 17)
        retry.isHidden = true
        retry.accessibilityIdentifier = "actorEmpireRendererRecoveryRetry"
        retry.addTarget(self, action: #selector(retryRendererRecovery), for: .touchUpInside)
        recoveryRetryButton = retry

        let stack = UIStackView(arrangedSubviews: [activity, title, message, retry])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 20
        stack.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(stack)
        view.addSubview(overlay)
        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: overlay.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: overlay.trailingAnchor, constant: -28),
            stack.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
        ])
        recoveryOverlay = overlay
        scheduleRecoveryTimeout()
    }

    private func scheduleRecoveryTimeout() {
        recoveryTimeout?.cancel()
        let timeout = DispatchWorkItem { [weak self] in self?.markRendererRecoveryFailed() }
        recoveryTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: timeout)
    }

    private func markRendererRecoveryFailed() {
        guard recoveryState.navigationFailed() == .showRetry else { return }
        recoveryMessage?.text = "Actor Empire could not finish loading. Your saved career was not changed."
        recoveryRetryButton?.isHidden = false
    }

    @objc private func retryRendererRecovery() {
        guard recoveryState.retry() == .reload else { return }
        recoveryMessage?.text = "Restoring your game from the last verified save…"
        recoveryRetryButton?.isHidden = true
        scheduleRecoveryTimeout()
        webView?.reload()
    }

    @objc private func handleStartupReady() {
        guard recoveryState.startupReady() == .hideRecovery else { return }
        recoveryTimeout?.cancel()
        recoveryTimeout = nil
        recoveryOverlay?.removeFromSuperview()
        recoveryOverlay = nil
        recoveryMessage = nil
        recoveryRetryButton = nil
    }

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginType(PurchasesPlugin.self)
        bridge?.registerPluginType(TrackingPermissionPlugin.self)
        bridge?.registerPluginType(IOSLongSessionDiagnosticsPlugin.self)
        bridge?.registerPluginType(IOSSaveTransferPlugin.self)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleStartupReady),
            name: .actorEmpireIOSStartupReady,
            object: nil
        )

        if let webView, let existingDelegate = webView.navigationDelegate {
            let diagnosticDelegate = IOSLongSessionNavigationDelegate(
                forwarding: existingDelegate,
                onRendererTermination: { [weak self] in
                    guard let self, self.recoveryState.terminated() == .showRecovery else { return }
                    self.showRendererRecovery()
                },
                onNavigationFailure: { [weak self] in self?.markRendererRecoveryFailed() }
            )
            longSessionNavigationDelegate = diagnosticDelegate
            webView.navigationDelegate = diagnosticDelegate
        }
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        IOSLongSessionDiagnosticsStore.shared.recordMemoryWarning()
        webView?.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('actor-empire-memory-warning', { detail: { platform: 'ios' } }))"
        )
    }
}
