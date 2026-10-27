package com.toneflix.music.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Keeps the app running while files upload, so switching to another app or
 * locking the phone doesn't freeze an upload halfway. Shows a quiet
 * "Uploading" notification while it runs, as Android requires.
 */
public class UploadService extends Service {

    static final String CHANNEL_ID = "uploads";
    static final int NOTIFICATION_ID = 7301;
    static final String EXTRA_COUNT = "count";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int count = intent != null ? intent.getIntExtra(EXTRA_COUNT, 1) : 1;

        createChannel();
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setContentTitle("Uploading")
            .setContentText(count > 1 ? count + " files are uploading" : "A file is uploading")
            .setProgress(0, 0, true)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);

        return START_NOT_STICKY;
    }

    /** Android 15 caps data sync time; the app gives up the slot rather than being stopped. */
    @Override
    public void onTimeout(int startId, int fgsType) {
        stopSelf();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Uploads", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Shows while files upload");
        manager.createNotificationChannel(channel);
    }
}
