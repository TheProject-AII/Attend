
package com.hris.mui;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import android.util.Log;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "MockLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class MockLocationPlugin extends Plugin {

    private LocationManager locationManager;
    private LocationListener locationListener;
    private Handler handler;

    private final List<PluginCall> pendingCalls = new ArrayList<>();

    private static final long MAX_LOCATION_AGE = 10000;
    private static final long GPS_TIMEOUT = 10000;

    // =========================================
    // CHECK MOCK LOCATION
    // =========================================

    @PluginMethod
    public void checkMockLocation(PluginCall call) {

        if (!pendingCalls.isEmpty()) {
            pendingCalls.add(call);
            return;
        }

        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias(
                "location",
                call,
                "locationPermsCallback"
            );
            return;
        }

        pendingCalls.add(call);

        try {

            locationManager = (LocationManager) getContext()
                .getSystemService(Context.LOCATION_SERVICE);

            if (locationManager == null) {
                finishWithError("Location service tidak tersedia.");
                return;
            }

            // =====================================
            // CEK GPS / LOCATION HP
            // =====================================

            if (!isLocationEnabled()) {

                JSObject result = new JSObject();

                result.put("checked", false);
                result.put("locationEnabled", false);
                result.put(
                    "message",
                    "Location HP belum aktif. Silakan aktifkan GPS."
                );

                finishWithResult(result);
                return;
            }

            handler = new Handler(Looper.getMainLooper());

            Location bestLocation = null;

            String[] providers = {
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER
            };

            long now = System.currentTimeMillis();

            // =====================================
            // CEK LAST KNOWN LOCATION
            // =====================================

            for (String provider : providers) {

                try {

                    if (!locationManager.isProviderEnabled(provider)) {
                        continue;
                    }

                    Location cached =
                        locationManager.getLastKnownLocation(provider);

                    if (cached == null) {
                        continue;
                    }

                    long age = now - cached.getTime();

                    if (age >= 0 && age <= MAX_LOCATION_AGE) {

                        if (
                            bestLocation == null ||
                            cached.getAccuracy() < bestLocation.getAccuracy()
                        ) {
                            bestLocation = cached;
                        }
                    }

                } catch (SecurityException ignored) {
                }
            }

            if (bestLocation != null) {
                finishWithLocation(bestLocation);
                return;
            }

            // =====================================
            // REQUEST GPS BARU
            // =====================================

            locationListener = new LocationListener() {

                @Override
                public void onLocationChanged(Location location) {
                    finishWithLocation(location);
                }

                @Override
                public void onProviderDisabled(String provider) {
                }

                @Override
                public void onProviderEnabled(String provider) {
                }

                @Override
                public void onStatusChanged(
                    String provider,
                    int status,
                    Bundle extras
                ) {
                }
            };

            boolean requested = false;

            for (String provider : providers) {

                try {

                    if (!locationManager.isProviderEnabled(provider)) {
                        continue;
                    }

                    locationManager.requestLocationUpdates(
                        provider,
                        0,
                        0,
                        locationListener,
                        Looper.getMainLooper()
                    );

                    requested = true;

                } catch (SecurityException ignored) {
                }
            }

            if (!requested) {
                finishWithError(
                    "GPS dan Network Location tidak tersedia."
                );
                return;
            }

            // =====================================
            // GPS TIMEOUT
            // =====================================

            handler.postDelayed(() -> {

                finishWithError(
                    "Tidak mendapatkan lokasi terbaru. Periksa GPS dan izin lokasi."
                );

            }, GPS_TIMEOUT);

        } catch (Exception e) {

            finishWithError(
                "Gagal membaca GPS: " + e.getMessage()
            );
        }
    }

    // =========================================
    // CHECK LOCATION ENABLED
    // =========================================

    private boolean isLocationEnabled() {

    if (locationManager == null) {
        Log.e("HRIS_GPS", "LocationManager NULL");
        return false;
    }

    try {
        boolean gps = locationManager.isProviderEnabled(
            LocationManager.GPS_PROVIDER
        );

        boolean network = locationManager.isProviderEnabled(
            LocationManager.NETWORK_PROVIDER
        );

        boolean enabled;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            enabled = locationManager.isLocationEnabled();
        } else {
            enabled = gps || network;
        }

        Log.d("HRIS_GPS", "GPS Provider: " + gps);
        Log.d("HRIS_GPS", "Network Provider: " + network);
        Log.d("HRIS_GPS", "Location Enabled: " + enabled);

        return enabled;

    } catch (Exception e) {
        Log.e("HRIS_GPS", "Location check error", e);
        return false;
    }
}

    // =========================================
    // OPEN LOCATION SETTINGS
    // =========================================

    @PluginMethod
    public void openLocationSettings(PluginCall call) {

        try {

            Intent intent = new Intent(
                Settings.ACTION_LOCATION_SOURCE_SETTINGS
            );

            getActivity().startActivity(intent);

            call.resolve();

        } catch (Exception e) {

            call.reject(
                "Gagal membuka pengaturan lokasi: " + e.getMessage()
            );
        }
    }

    // =========================================
    // LOCATION PERMISSION CALLBACK
    // =========================================

    @PermissionCallback
    private void locationPermsCallback(PluginCall call) {

        if (getPermissionState("location") == PermissionState.GRANTED) {

            checkMockLocation(call);

        } else {

            call.reject("Izin lokasi belum diberikan.");
        }
    }

    // =========================================
    // FINISH WITH LOCATION
    // =========================================

    private void finishWithLocation(Location location) {

        if (pendingCalls.isEmpty()) {
            return;
        }

        boolean isMock;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            isMock = location.isMock();
        } else {
            isMock = location.isFromMockProvider();
        }

        JSObject result = new JSObject();

        result.put("checked", true);
        result.put("locationEnabled", true);
        result.put("isMock", isMock);
        result.put("latitude", location.getLatitude());
        result.put("longitude", location.getLongitude());
        result.put("accuracy", location.getAccuracy());
        result.put("time", location.getTime());

        finishWithResult(result);
    }

    // =========================================
    // FINISH WITH RESULT
    // =========================================

    private void finishWithResult(JSObject result) {

        cleanup();

        List<PluginCall> calls = new ArrayList<>(pendingCalls);
        pendingCalls.clear();

        for (PluginCall call : calls) {
            call.resolve(result);
        }
    }

    // =========================================
    // FINISH WITH ERROR
    // =========================================

    private void finishWithError(String message) {

        if (pendingCalls.isEmpty()) {
            cleanup();
            return;
        }

        cleanup();

        List<PluginCall> calls = new ArrayList<>(pendingCalls);
        pendingCalls.clear();

        for (PluginCall call : calls) {
            call.reject(message);
        }
    }

    // =========================================
    // CLEANUP GPS LISTENER
    // =========================================

    private void cleanup() {

        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
            handler = null;
        }

        if (locationManager != null && locationListener != null) {

            try {
                locationManager.removeUpdates(locationListener);
            } catch (SecurityException ignored) {
            }
        }

        locationListener = null;
    }

    // =========================================
    // CONFIGURE AUTO CHECKOUT
    // =========================================

    @PluginMethod
    public void configureAutoCheckout(PluginCall call) {

        String token = call.getString("token");

        String apiUrl = call.getString(
            "apiUrl",
            "https://hris.so-mak.com/api/attendance/auto-checkout/location"
        );

        if (token == null || token.trim().isEmpty()) {

            call.reject("Token tidak ditemukan.");
            return;
        }

        SharedPreferences prefs = getContext().getSharedPreferences(
            "HRIS_AUTO_CHECKOUT",
            Context.MODE_PRIVATE
        );

        prefs.edit()
            .putString("token", token)
            .putString("api_url", apiUrl)
            .apply();

        AutoCheckoutScheduler.scheduleNext(getContext());

        JSObject result = new JSObject();
        result.put("success", true);

        call.resolve(result);
    }

    // =========================================
    // OPEN BACKGROUND LOCATION SETTINGS
    // =========================================

    @PluginMethod
    public void openBackgroundLocationSettings(PluginCall call) {

        if (
            getPermissionState("location") != PermissionState.GRANTED
        ) {

            call.reject("Aktifkan izin lokasi terlebih dahulu.");
            return;
        }

        try {

            Intent intent = new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse(
                    "package:" + getContext().getPackageName()
                )
            );

            getActivity().startActivity(intent);

            call.resolve();

        } catch (Exception e) {

            call.reject(
                "Tidak dapat membuka pengaturan lokasi: " + e.getMessage()
            );
        }
    }
}
