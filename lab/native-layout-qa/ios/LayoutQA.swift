import UIKit
import WebKit

@main
final class LayoutQAAppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate {
    var window: UIWindow?
    private var webView: WKWebView?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let controller = UIViewController()
        controller.view.backgroundColor = .white

        let webView = WKWebView(frame: controller.view.bounds)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        controller.view.addSubview(webView)
        self.webView = webView

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = controller
        window.makeKeyAndVisible()
        self.window = window

        let url = URL(string: "http://127.0.0.1:5178/scripts/fixtures/responsive-layout-qa.html")!
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
        guard let webView = webView else { return }
        let label = UILabel(frame: webView.bounds.insetBy(dx: 20, dy: 40))
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        label.numberOfLines = 0
        label.textColor = .red
        label.text = "Layout QA page failed: \(message)"
        webView.addSubview(label)
    }
}
