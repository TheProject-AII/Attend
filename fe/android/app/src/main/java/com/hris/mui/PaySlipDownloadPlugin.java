

package com.hris.mui;


import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import android.util.Base64;

@CapacitorPlugin(name = "PaySlipDownload")
public class PaySlipDownloadPlugin extends Plugin {

    @PluginMethod
    public void savePdf(PluginCall call) {
        String fileName = call.getString("fileName");
        String base64 = call.getString("data");

        if (fileName == null || base64 == null) {
            call.reject("Nama file atau data PDF tidak tersedia");
            return;
        }

        Uri fileUri = null;

        try {
            byte[] pdfBytes = Base64.decode(base64, Base64.DEFAULT);

            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(
                    MediaStore.MediaColumns.RELATIVE_PATH,
                    Environment.DIRECTORY_DOWNLOADS
                );
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            }

            fileUri = getContext().getContentResolver().insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                values
            );

            if (fileUri == null) {
                throw new Exception("Gagal membuat file di folder Download");
            }

            try (OutputStream output = getContext()
                    .getContentResolver()
                    .openOutputStream(fileUri)) {

                if (output == null) {
                    throw new Exception("Gagal membuka file");
                }

                output.write(pdfBytes);
                output.flush();
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues completed = new ContentValues();
                completed.put(MediaStore.MediaColumns.IS_PENDING, 0);

                getContext().getContentResolver().update(
                    fileUri,
                    completed,
                    null,
                    null
                );
            }

            JSObject result = new JSObject();
            result.put("uri", fileUri.toString());
            result.put("fileName", fileName);

            call.resolve(result);

        } catch (Exception e) {
            if (fileUri != null) {
                getContext().getContentResolver().delete(
                    fileUri,
                    null,
                    null
                );
            }

            call.reject("Gagal menyimpan Payslip: " + e.getMessage(), e);
        }
    }
}
