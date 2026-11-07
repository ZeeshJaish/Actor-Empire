import AppKit
import WebKit
import Foundation

// macOS system WebKit validation; this is not iPhone device certification.
final class StorageAudit: NSObject, WKNavigationDelegate {
    var view: WKWebView!
    let target: URL
    init(_ url: URL) { target = url; super.init() }
    func start() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        view = WKWebView(frame: NSRect(x: 0, y: 0, width: 390, height: 844), configuration: configuration)
        view.navigationDelegate = self
        view.load(URLRequest(url: target))
        DispatchQueue.main.asyncAfter(deadline: .now() + 90) {
            fputs("System WebKit storage audit timed out\n", stderr); exit(1)
        }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.callAsyncJavaScript("""
            for (let i=0; i<100 && !window.saveBlocksQA; i++) await new Promise(r=>setTimeout(r,50));
            if (!window.saveBlocksQA) throw new Error('Storage fixture did not load');
            return JSON.stringify({engine:'system WebKit',results:await window.saveBlocksQA.runChecks()});
            """, arguments: [:], in: nil, in: .page) { result in
                switch result {
                case .success(let value): print(value); exit(0)
                case .failure(let error): fputs("System WebKit storage failure: \(error)\n", stderr); exit(1)
                }
            }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        fputs("System WebKit navigation failed: \(error)\n", stderr); exit(1)
    }
}
guard CommandLine.arguments.count == 2, let url = URL(string: CommandLine.arguments[1]) else { exit(2) }
let application = NSApplication.shared
application.setActivationPolicy(.prohibited)
let audit = StorageAudit(url)
audit.start()
application.run()
