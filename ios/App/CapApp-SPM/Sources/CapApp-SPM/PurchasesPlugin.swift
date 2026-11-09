import Foundation
import Capacitor
import StoreKit
import FirebaseAnalytics

@objc(PurchasesPlugin)
public class PurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PurchasesPlugin"
    public let jsName = "Purchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishTransaction", returnType: CAPPluginReturnPromise)
    ]
    private var transactionUpdatesTask: Task<Void, Never>?
    /* Verified transactions handed to the game and not yet finished. The game finishes each one (finishTransaction)
       only after it has granted and saved what was bought. Until then StoreKit keeps it open, and gives any transaction
       still open to Transaction.updates at the next launch, so a crash or a failed save loses nothing. */
    @MainActor private var openTransactions: [UInt64: Transaction] = [:]

    @MainActor
    private func keepOpen(_ transaction: Transaction) {
        openTransactions[transaction.id] = transaction
    }

    @MainActor
    private func takeOpen(_ transactionId: UInt64) -> Transaction? {
        return openTransactions.removeValue(forKey: transactionId)
    }

    /* after a relaunch the transaction is no longer in memory: StoreKit still lists it among the unfinished ones */
    private func findUnfinished(_ transactionId: UInt64) async -> Transaction? {
        for await result in Transaction.unfinished {
            if case .verified(let transaction) = result, transaction.id == transactionId {
                return transaction
            }
        }
        return nil
    }
    private let loggedTransactionIdsKey = "actor_empire_logged_storekit_transactions_v1"
    private let maxLoggedTransactionIds = 2048

    @MainActor
    private func logVerifiedPurchase(_ transaction: Transaction) {
        let transactionId = String(transaction.id)
        var loggedIds = UserDefaults.standard.stringArray(forKey: loggedTransactionIdsKey) ?? []
        guard !loggedIds.contains(transactionId) else { return }

        Analytics.logTransaction(transaction)
        loggedIds.append(transactionId)
        if loggedIds.count > maxLoggedTransactionIds {
            loggedIds.removeFirst(loggedIds.count - maxLoggedTransactionIds)
        }
        UserDefaults.standard.set(loggedIds, forKey: loggedTransactionIdsKey)
    }

    public override func load() {
        super.load()
        startTransactionUpdatesListener()
    }

    deinit {
        transactionUpdatesTask?.cancel()
    }

    private func startTransactionUpdatesListener() {
        guard transactionUpdatesTask == nil else { return }

        transactionUpdatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                await self?.handleTransactionUpdate(update)
            }
        }
    }

    private func notifyPurchaseCompleted(productId: String, transactionId: UInt64) async {
        await MainActor.run {
            self.notifyListeners("purchaseCompleted", data: [
                "productId": productId,
                "transactionId": String(transactionId)
            ], retainUntilConsumed: true)
        }
    }

    private func handleTransactionUpdate(_ verification: VerificationResult<Transaction>) async {
        switch verification {
        case .verified(let transaction):
            /* a refund or a revoked purchase: nothing to deliver, so it is closed here and never granted */
            if transaction.revocationDate != nil {
                await transaction.finish()
                return
            }
            await logVerifiedPurchase(transaction)
            /* left open: the game finishes it with finishTransaction once the grant is saved */
            await keepOpen(transaction)
            await notifyPurchaseCompleted(productId: transaction.productID, transactionId: transaction.id)
        case .unverified(_, let error):
            await MainActor.run {
                self.notifyListeners("purchaseFailed", data: [
                    "message": "Purchase could not be verified: \(error.localizedDescription)"
                ], retainUntilConsumed: true)
            }
        }
    }

    @objc public func getProducts(_ call: CAPPluginCall) {
        let productIds = call.getArray("productIds", String.self) ?? []
        guard !productIds.isEmpty else {
            call.reject("No product IDs provided.")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: productIds)
                let payload = products.map { product in
                    [
                        "productId": product.id,
                        "title": product.displayName,
                        "description": product.description,
                        "price": NSDecimalNumber(decimal: product.price).doubleValue,
                        "priceLabel": product.displayPrice,
                        "type": product.type.rawValue
                    ] as [String: Any]
                }

                call.resolve(["products": payload])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc public func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("Missing productId.")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found in App Store.")
                    return
                }

                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await self.logVerifiedPurchase(transaction)
                        /* not finished here: the game grants and saves the purchase first, then calls finishTransaction */
                        await self.keepOpen(transaction)
                        call.resolve([
                            "productId": productId,
                            "transactionId": String(transaction.id),
                            "finishRequired": true
                        ])
                    case .unverified(_, let error):
                        call.reject("Purchase could not be verified: \(error.localizedDescription)")
                    }
                case .userCancelled:
                    call.resolve(["cancelled": true])
                case .pending:
                    call.resolve(["pending": true])
                @unknown default:
                    call.reject("Unknown purchase state.")
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc public func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                var restoredProductIds: [String] = []

                for await entitlement in Transaction.currentEntitlements {
                    if case .verified(let transaction) = entitlement {
                        restoredProductIds.append(transaction.productID)
                    }
                }

                call.resolve(["productIds": Array(Set(restoredProductIds))])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    /* The game saved the grant for this transaction: StoreKit may now forget it. */
    @objc public func finishTransaction(_ call: CAPPluginCall) {
        guard let rawId = call.getString("transactionId"), let transactionId = UInt64(rawId) else {
            call.reject("Missing transactionId.")
            return
        }

        Task {
            var finished = false
            var transaction = await self.takeOpen(transactionId)
            if transaction == nil {
                transaction = await self.findUnfinished(transactionId)
            }
            if let transaction = transaction {
                await transaction.finish()
                finished = true
            }
            call.resolve(["finished": finished])
        }
    }
}
