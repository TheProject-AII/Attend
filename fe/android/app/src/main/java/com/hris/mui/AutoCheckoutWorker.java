
package com.hris.mui;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.app.NotificationCompat;
import androidx.work.ForegroundInfo;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public class AutoCheckoutWorker extends Worker {

    private static final String CHANNEL_ID = "auto_checkout_gps";
    private static final int NOTIFICATION_ID = 1001;

    public AutoCheckoutWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params
    ) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Result result = runAutoCheckout();

        AutoCheckoutScheduler.scheduleNext(getApplicationContext());

        return result;
    }
   
    private Result runAutoCheckout() {
        Context context = getApplicationContext();

        // =====================================
        // 1. AMBIL TOKEN
        // =====================================

        SharedPreferences prefs = context.getSharedPreferences(
            "HRIS_AUTO_CHECKOUT",
            Context.MODE_PRIVATE
        );

        String token = prefs.getString("token", null);

        String apiUrl = prefs.getString(
            "api_url",
            "https://hris.so-mak.com/api/attendance/auto-checkout/location"
        );

        if (token == null || token.trim().isEmpty()) {
            return Result.failure();
        }

        // =====================================
        // 2. CEK IZIN GPS
        // =====================================

        if (
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return Result.failure();
        }

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return Result.failure();
        }

        // =====================================
        // 3. AKTIFKAN FOREGROUND SERVICE
        // =====================================

        try {
            setForegroundAsync(createForegroundInfo()).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Result.retry();
        } catch (Exception e) {
            return Result.retry();
        }

        LocationManager manager = (LocationManager)
            context.getSystemService(Context.LOCATION_SERVICE);

        if (manager == null) {
            return Result.retry();
        }

        AtomicReference<Location> captured =
            new AtomicReference<>();

        CountDownLatch latch = new CountDownLatch(1);

        LocationListener listener = new LocationListener() {

            @Override
            public void onLocationChanged(
                @NonNull Location location
            ) {
                captured.set(location);
                latch.countDown();
            }

            @Override
            public void onProviderEnabled(
                @NonNull String provider
            ) {}

            @Override
            public void onProviderDisabled(
                @NonNull String provider
            ) {}

            @Override
            public void onStatusChanged(
                String provider,
                int status,
                Bundle extras
            ) {}
        };

        boolean requested = false;

        try {

            // =====================================
            // 4. REQUEST GPS SATU KALI
            // =====================================

            String[] providers = {
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER
            };

            for (String provider : providers) {

                try {

                    if (!manager.isProviderEnabled(provider)) {
                        continue;
                    }

                    manager.requestLocationUpdates(
                        provider,
                        0,
                        0,
                        listener,
                        Looper.getMainLooper()
                    );

                    requested = true;

                } catch (SecurityException ignored) {
                }
            }

            if (!requested) {
                return Result.retry();
            }

            // Maksimal menunggu GPS 25 detik.
            boolean received = latch.await(
                25,
                TimeUnit.SECONDS
            );

            if (!received || captured.get() == null) {
                return Result.retry();
            }

            Location location = captured.get();

            // =====================================
            // 5. VALIDASI UMUR GPS
            // =====================================

            long locationAge =
                System.currentTimeMillis() - location.getTime();

            if (locationAge < 0 || locationAge > 60000) {
                return Result.retry();
            }

            // =====================================
            // 6. VALIDASI MOCK LOCATION
            // =====================================

            boolean isMock;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                isMock = location.isMock();
            } else {
                isMock = location.isFromMockProvider();
            }

            if (isMock) {
                return Result.failure();
            }

            // =====================================
            // 7. KIRIM GPS KE BACKEND
            // =====================================

            return sendLocation(
                apiUrl,
                token,
                location
            );

        } catch (SecurityException e) {

            return Result.failure();

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();
            return Result.retry();

        } catch (Exception e) {

            return Result.retry();

        } finally {

            // Hentikan request GPS setelah selesai.
            try {
                manager.removeUpdates(listener);
            } catch (Exception ignored) {
            }
        }
    }

    // =====================================
    // FOREGROUND NOTIFICATION
    // =====================================

    private ForegroundInfo createForegroundInfo() {

        Context context = getApplicationContext();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            NotificationChannel channel =
                new NotificationChannel(
                    CHANNEL_ID,
                    "Auto Checkout GPS",
                    NotificationManager.IMPORTANCE_LOW
                );

            NotificationManager manager =
                (NotificationManager) context.getSystemService(
                    Context.NOTIFICATION_SERVICE
                );

            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }

        Notification notification =
            new NotificationCompat.Builder(
                context,
                CHANNEL_ID
            )
                .setContentTitle("HRIS Attendance")
                .setContentText(
                    "Sedang mengambil lokasi auto-checkout."
                )
                .setSmallIcon(
                    android.R.drawable.ic_menu_mylocation
                )
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

            return new ForegroundInfo(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            );
        }

        return new ForegroundInfo(
            NOTIFICATION_ID,
            notification
        );
    }

    // =====================================
    // SEND GPS TO BACKEND
    // =====================================

    private Result sendLocation(
        String apiUrl,
        String token,
        Location location
    ) {

        HttpURLConnection connection = null;

        try {

            URL url = new URL(apiUrl);

            connection = (HttpURLConnection)
                url.openConnection();

            connection.setRequestMethod("POST");
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.setDoOutput(true);

            connection.setRequestProperty(
                "Authorization",
                "Bearer " + token
            );

            connection.setRequestProperty(
                "Content-Type",
                "application/json"
            );

            JSONObject body = new JSONObject();

            body.put(
                "latitude",
                location.getLatitude()
            );

            body.put(
                "longitude",
                location.getLongitude()
            );

            body.put(
                "accuracy",
                location.getAccuracy()
            );

            byte[] data = body.toString().getBytes(
                StandardCharsets.UTF_8
            );

            try (
                OutputStream output = connection.getOutputStream()
            ) {
                output.write(data);
                output.flush();
            }

            int status = connection.getResponseCode();

            if (status >= 200 && status < 300) {
                return Result.success();
            }

            if (
                status == 400 ||
                status == 401 ||
                status == 403 ||
                status == 404
            ) {
                return Result.failure();
            }

            return Result.retry();

        } catch (Exception e) {

            return Result.retry();

        } finally {

            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
