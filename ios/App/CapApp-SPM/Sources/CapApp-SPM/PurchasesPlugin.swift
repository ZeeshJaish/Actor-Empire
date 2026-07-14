import Foundation
import Capacitor
import StoreKit

@objc(PurchasesPlugin)
public class PurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PurchasesPlugin"
    public let jsName = "Purchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]
    private var transactionUpdatesTask: Task<Void, Never>?

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
            await notifyPurchaseCompleted(productId: transaction.productID, transactionId: transaction.id)
            await transaction.finish()
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
                        await transaction.finish()
                        call.resolve([
                            "productId": productId,
                            "transactionId": String(transaction.id)
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
}
