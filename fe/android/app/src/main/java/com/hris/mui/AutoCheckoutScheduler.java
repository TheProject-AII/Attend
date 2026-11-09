
package com.hris.mui;

import android.content.Context;

import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import java.util.Calendar;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

public class AutoCheckoutScheduler {

    private static final String WORK_PREFIX =
        "hris_auto_checkout_gps_";

    public static void scheduleNext(Context context) {

        TimeZone jakarta = TimeZone.getTimeZone("Asia/Jakarta");

        Calendar now = Calendar.getInstance(jakarta);
        Calendar target = (Calendar) now.clone();

        target.set(Calendar.HOUR_OF_DAY, 18);
        target.set(Calendar.MINUTE, 30);
        target.set(Calendar.SECOND, 0);
        target.set(Calendar.MILLISECOND, 0);

        // Jika sudah melewati 18:30,
        // jadwalkan untuk besok.
        if (!now.before(target)) {
            target.add(Calendar.DAY_OF_MONTH, 1);
        }

        long delay = target.getTimeInMillis()
            - now.getTimeInMillis();

        String workName = WORK_PREFIX
            + target.get(Calendar.YEAR)
            + "_"
            + target.get(Calendar.DAY_OF_YEAR);

        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build();

        OneTimeWorkRequest request =
            new OneTimeWorkRequest.Builder(AutoCheckoutWorker.class)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .setConstraints(constraints)
                .build();

        WorkManager.getInstance(context)
            .enqueueUniqueWork(
                workName,
                ExistingWorkPolicy.KEEP,
                request
            );
    }
}
