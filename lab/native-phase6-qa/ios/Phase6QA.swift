import UIKit
import WebKit

@main
final class Phase6QAAppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate {
    var window: UIWindow?
    private var webView: WKWebView?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let controller = UIViewController()
        controller.view.backgroundColor = .black

        let configuration = WKWebViewConfiguration()
        let textStress = WKUserScript(
            source: "document.documentElement.style.fontSize = '125%';",
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        configuration.userContentController.addUserScript(textStress)
        let webView = WKWebView(frame: controller.view.bounds, configuration: configuration)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        controller.view.addSubview(webView)
        self.webView = webView

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = controller
        window.makeKeyAndVisible()
        self.window = window

        let url = URL(string: "http://127.0.0.1:5178/phase5-boxoffice-detail-qa.html?mode=theatrical&lang=pt-BR")!
        webView.load(URLRequest(url: url))
        return true
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showFailure(error.localizedDescription)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showFailure(error.localizedDescription)
    }

    private func showFailure(_ message: String) {
        guard let webView else { return }
        let label = UILabel(frame: webView.bounds.insetBy(dx: 20, dy: 40))
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        label.numberOfLines = 0
        label.textColor = .red
        label.text = "Responsive QA failed to load: \(message)"
        webView.addSubview(label)
    }
}
