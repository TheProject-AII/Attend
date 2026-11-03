
package com.hris.mui;

import android.Manifest;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

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
                .getSystemService(getContext().LOCATION_SERVICE);

            if (locationManager == null) {
                finishWithError("Location service tidak tersedia.");
                return;
            }

            handler = new Handler(Looper.getMainLooper());

            Location bestLocation = null;

            String[] providers = {
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER
            };

            long now = System.currentTimeMillis();

            // Cari lokasi terakhir dari semua provider.
            for (String provider : providers) {
                try {
                    if (!locationManager.isProviderEnabled(provider)) {
                        continue;
                    }

                    Location cached =
                        locationManager.getLastKnownLocation(provider);

                    if (cached == null) continue;

                    long age = now - cached.getTime();

                    if (age >= 0 && age <= MAX_LOCATION_AGE) {
                        if (bestLocation == null ||
                            cached.getAccuracy() < bestLocation.getAccuracy()) {
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
                finishWithError("GPS dan Network Location tidak tersedia.");
                return;
            }

            handler.postDelayed(() -> {
                finishWithError(
                    "Tidak mendapatkan lokasi terbaru. Periksa GPS dan izin lokasi."
                );
            }, GPS_TIMEOUT);

        } catch (Exception e) {
            finishWithError("Gagal membaca GPS: " + e.getMessage());
        }
    }

    @PermissionCallback
    private void locationPermsCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            checkMockLocation(call);
        } else {
            call.reject("Izin lokasi belum diberikan.");
        }
    }

    private void finishWithLocation(Location location) {

        if (pendingCalls.isEmpty()) return;

        boolean isMock;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            isMock = location.isMock();
        } else {
            isMock = location.isFromMockProvider();
        }

        JSObject result = new JSObject();

        result.put("checked", true);
        result.put("isMock", isMock);
        result.put("latitude", location.getLatitude());
        result.put("longitude", location.getLongitude());
        result.put("accuracy", location.getAccuracy());
        result.put("time", location.getTime());

        cleanup();

        List<PluginCall> calls = new ArrayList<>(pendingCalls);
        pendingCalls.clear();

        for (PluginCall call : calls) {
            call.resolve(result);
        }
    }

    private void finishWithError(String message) {

        if (pendingCalls.isEmpty()) return;

        cleanup();

        List<PluginCall> calls = new ArrayList<>(pendingCalls);
        pendingCalls.clear();

        for (PluginCall call : calls) {
            call.reject(message);
        }
    }

    private void cleanup() {

        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }

        if (locationManager != null && locationListener != null) {
            try {
                locationManager.removeUpdates(locationListener);
            } catch (SecurityException ignored) {
            }
        }

        locationListener = null;
    }
}
