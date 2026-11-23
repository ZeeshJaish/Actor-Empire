import UIKit
import Capacitor
#if DEBUG
import GoogleMobileAds
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        #if DEBUG
        logAdNetworkStatusForTesting()
        #endif
        return true
    }

    #if DEBUG
    /// Debug builds only (ad mediation test, 23 Nov 2026): every 15 s for 5 minutes, print each ad
    /// network's start-up state (AdMob, Unity) as "AE-ADS" lines. Never compiled into a store build.
    private func logAdNetworkStatusForTesting() {
        var ticks = 0
        Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { timer in
            ticks += 1
            let statuses = MobileAds.shared.initializationStatus.adapterStatusesByClassName
            if statuses.isEmpty {
                NSLog("AE-ADS t=%ds: ads SDK not started yet", ticks * 15)
            }
            for (name, status) in statuses.sorted(by: { $0.key < $1.key }) {
                let state = status.state == .ready ? "READY" : "NOT_READY"
                NSLog("AE-ADS t=%ds: %@ = %@ (%.2fs) %@", ticks * 15, name, state, status.latency, status.description)
            }
            if ticks >= 20 { timer.invalidate() }
        }
    }
    #endif

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        NotificationCenter.default.post(name: Notification.Name("didReceiveRemoteNotification"), object: completionHandler, userInfo: userInfo)
    }

    // With the scene life cycle, links and Universal Links arrive in SceneDelegate,
    // and the foreground/background methods above are no longer called.
    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
