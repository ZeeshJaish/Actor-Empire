package com.zeeshapps.actorempire;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "AndroidPurchases")
public class AndroidPurchasesPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall activePurchaseCall;
    private final Map<String, ProductDetails> productDetailsById = new HashMap<>();

    @Override
    public void load() {
        PendingPurchasesParams pendingPurchasesParams = PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .build();
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(pendingPurchasesParams)
            .build();
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        List<String> productIds = getStringList(call.getArray("productIds", new JSArray()));
        if (productIds.isEmpty()) {
            call.resolve(new JSObject().put("products", new JSArray()));
            return;
        }

        startConnection(call, () -> queryProducts(call, productIds));
    }

    @PluginMethod
    public void purchaseProduct(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Missing productId.");
            return;
        }
        if (activePurchaseCall != null) {
            call.reject("Another purchase is already in progress.");
            return;
        }

        startConnection(call, () -> {
            ProductDetails details = productDetailsById.get(productId);
            if (details == null) {
                List<String> productIds = new ArrayList<>();
                productIds.add(productId);
                queryProducts(call, productIds, () -> launchPurchase(call, productId));
                return;
            }
            launchPurchase(call, productId);
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        startConnection(call, () -> billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build(),
            (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(billingResult.getDebugMessage());
                    return;
                }
                JSArray restored = new JSArray();
                for (Purchase purchase : purchases) {
                    restored.put(purchaseToJson(purchase));
                }
                call.resolve(new JSObject().put("purchases", restored));
            }
        ));
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null || purchaseToken.trim().isEmpty()) {
            call.reject("Missing purchaseToken.");
            return;
        }

        startConnection(call, () -> {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build();
            billingClient.acknowledgePurchase(params, result -> resolveBillingAction(call, result));
        });
    }

    @PluginMethod
    public void consumePurchase(PluginCall call) {
        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null || purchaseToken.trim().isEmpty()) {
            call.reject("Missing purchaseToken.");
            return;
        }

        startConnection(call, () -> {
            ConsumeParams params = ConsumeParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build();
            billingClient.consumeAsync(params, (result, token) -> resolveBillingAction(call, result));
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        PluginCall call = activePurchaseCall;
        activePurchaseCall = null;
        if (call == null) return;

        int code = billingResult.getResponseCode();
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.resolve(new JSObject().put("cancelled", true));
            return;
        }
        if (code != BillingClient.BillingResponseCode.OK) {
            call.reject(billingResult.getDebugMessage());
            return;
        }

        JSArray purchaseArray = new JSArray();
        if (purchases != null) {
            for (Purchase purchase : purchases) {
                purchaseArray.put(purchaseToJson(purchase));
            }
        }
        call.resolve(new JSObject().put("purchases", purchaseArray));
    }

    private void startConnection(PluginCall call, Runnable onReady) {
        if (billingClient.isReady()) {
            onReady.run();
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(billingResult.getDebugMessage());
                    return;
                }
                onReady.run();
            }

            @Override
            public void onBillingServiceDisconnected() {
            }
        });
    }

    private void queryProducts(PluginCall call, List<String> productIds) {
        queryProducts(call, productIds, () -> {
            JSArray products = new JSArray();
            for (String productId : productIds) {
                ProductDetails details = productDetailsById.get(productId);
                if (details != null) {
                    products.put(productToJson(details));
                }
            }
            call.resolve(new JSObject().put("products", products));
        });
    }

    private void queryProducts(PluginCall call, List<String> productIds, Runnable onComplete) {
        List<QueryProductDetailsParams.Product> requestedProducts = new ArrayList<>();
        for (String productId : productIds) {
            requestedProducts.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build());
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(requestedProducts)
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject(billingResult.getDebugMessage());
                return;
            }

            for (ProductDetails details : productDetailsResult.getProductDetailsList()) {
                productDetailsById.put(details.getProductId(), details);
            }
            onComplete.run();
        });
    }

    private void launchPurchase(PluginCall call, String productId) {
        ProductDetails details = productDetailsById.get(productId);
        if (details == null) {
            call.reject("Product unavailable.");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Purchase activity unavailable.");
            return;
        }

        List<BillingFlowParams.ProductDetailsParams> detailsParamsList = new ArrayList<>();
        detailsParamsList.add(BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(details)
            .build());
        BillingFlowParams params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(detailsParamsList)
            .build();

        activePurchaseCall = call;
        BillingResult result = billingClient.launchBillingFlow(activity, params);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            activePurchaseCall = null;
            call.reject(result.getDebugMessage());
        }
    }

    private JSObject productToJson(ProductDetails details) {
        JSObject price = getOneTimePrice(details);
        return new JSObject()
            .put("productId", details.getProductId())
            .put("title", details.getTitle())
            .put("description", details.getDescription())
            .put("priceLabel", price.optString("priceLabel", ""))
            .put("priceMicros", price.optLong("priceMicros", 0L))
            .put("currencyCode", price.optString("currencyCode", ""))
            .put("type", "inapp");
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSArray productIds = new JSArray();
        for (String productId : purchase.getProducts()) {
            productIds.put(productId);
        }

        return new JSObject()
            .put("productIds", productIds)
            .put("purchaseToken", purchase.getPurchaseToken())
            .put("orderId", purchase.getOrderId())
            .put("purchaseState", purchase.getPurchaseState())
            .put("acknowledged", purchase.isAcknowledged());
    }

    private JSObject getOneTimePrice(ProductDetails details) {
        JSObject fallback = new JSObject()
            .put("priceLabel", "")
            .put("priceMicros", 0L)
            .put("currencyCode", "");

        Object offerDetails = invoke(details, "getOneTimePurchaseOfferDetails");
        if (offerDetails == null) {
            Object offerDetailsList = invoke(details, "getOneTimePurchaseOfferDetailsList");
            if (offerDetailsList instanceof List<?> && !((List<?>) offerDetailsList).isEmpty()) {
                offerDetails = ((List<?>) offerDetailsList).get(0);
            }
        }
        if (offerDetails == null) {
            return fallback;
        }

        String formattedPrice = String.valueOf(invoke(offerDetails, "getFormattedPrice"));
        Object priceMicros = invoke(offerDetails, "getPriceAmountMicros");
        String currencyCode = String.valueOf(invoke(offerDetails, "getPriceCurrencyCode"));

        return new JSObject()
            .put("priceLabel", "null".equals(formattedPrice) ? "" : formattedPrice)
            .put("priceMicros", priceMicros instanceof Long ? priceMicros : 0L)
            .put("currencyCode", "null".equals(currencyCode) ? "" : currencyCode);
    }

    private Object invoke(Object target, String methodName) {
        try {
            Method method = target.getClass().getMethod(methodName);
            return method.invoke(target);
        } catch (Exception ignored) {
            return null;
        }
    }

    private List<String> getStringList(JSArray array) {
        List<String> values = new ArrayList<>();
        for (int index = 0; index < array.length(); index++) {
            String value = array.optString(index, "");
            if (!value.trim().isEmpty()) {
                values.add(value);
            }
        }
        return values;
    }

    private void resolveBillingAction(PluginCall call, BillingResult result) {
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            call.reject(result.getDebugMessage());
            return;
        }
        call.resolve(new JSObject().put("success", true));
    }
}
