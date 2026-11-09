
package com.hris.mui;

import android.os.Bundle;
import android.view.View;
import android.graphics.Color;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {

        registerPlugin(MockLocationPlugin.class);

        super.onCreate(savedInstanceState);

        // Aktifkan edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Status bar putih dengan ikon gelap
        getWindow().setStatusBarColor(Color.WHITE);

        WindowCompat.getInsetsController(
            getWindow(),
            getWindow().getDecorView()
        ).setAppearanceLightStatusBars(true);

        // Ambil root content Android
        View rootView = findViewById(android.R.id.content);

        // Atur ruang status bar dan navigasi sistem
        ViewCompat.setOnApplyWindowInsetsListener(
            rootView,
            (view, windowInsets) -> {

                int systemBars =
                    WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout();

                Insets insets = windowInsets.getInsets(systemBars);

                // Berikan ruang untuk Dynamic Bar dan navigasi Android
                view.setPadding(
                    insets.left,
                    insets.top,
                    insets.right,
                    insets.bottom
                );

                // Hindari inset diterapkan dua kali oleh WebView
                return new WindowInsetsCompat.Builder(windowInsets)
                    .setInsets(systemBars, Insets.NONE)
                    .build();
            }
        );

        ViewCompat.requestApplyInsets(rootView);
    }
}
