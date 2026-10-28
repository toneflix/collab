package com.toneflix.music.app;

import androidx.annotation.OptIn;
import androidx.media3.common.ForwardingPlayer;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.util.HashMap;
import java.util.Map;

/**
 * The player as the notification, lock screen and headset see it. Next and
 * previous go through PlayerEngine so they follow the app's rules (wrap with
 * repeat all, queue end with repeat off), and next stays available on the
 * last track. The queue itself can only be changed by the app.
 */
@OptIn(markerClass = UnstableApi.class)
final class SessionPlayer extends ForwardingPlayer {

    private final PlayerEngine engine;
    private final Map<Player.Listener, Player.Listener> wrapped = new HashMap<>();

    SessionPlayer(Player player, PlayerEngine engine) {
        super(player);
        this.engine = engine;
    }

    @Override
    public void seekToNext() {
        engine.next();
    }

    @Override
    public void seekToNextMediaItem() {
        engine.next();
    }

    @Override
    public void seekToPrevious() {
        engine.previous();
    }

    @Override
    public void seekToPreviousMediaItem() {
        engine.previous();
    }

    @Override
    public Commands getAvailableCommands() {
        return adjust(super.getAvailableCommands());
    }

    @Override
    public boolean isCommandAvailable(int command) {
        return getAvailableCommands().contains(command);
    }

    private Commands adjust(Commands commands) {
        Commands.Builder builder = commands
            .buildUpon()
            .removeAll(COMMAND_CHANGE_MEDIA_ITEMS, COMMAND_SET_MEDIA_ITEM, COMMAND_SET_REPEAT_MODE, COMMAND_SET_SHUFFLE_MODE);
        if (getMediaItemCount() > 0) {
            builder.addAll(COMMAND_SEEK_TO_NEXT, COMMAND_SEEK_TO_NEXT_MEDIA_ITEM, COMMAND_SEEK_TO_PREVIOUS, COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM);
        }
        return builder.build();
    }

    /**
     * The session reads available commands from change events too, which come
     * straight from ExoPlayer, so those are adjusted the same way on the way through.
     */
    @Override
    public void addListener(Player.Listener listener) {
        Player.Listener proxy = (Player.Listener) Proxy.newProxyInstance(
            Player.Listener.class.getClassLoader(),
            new Class<?>[] { Player.Listener.class },
            (self, method, args) -> {
                switch (method.getName()) {
                    case "equals":
                        return self == args[0];
                    case "hashCode":
                        return System.identityHashCode(self);
                    case "toString":
                        return "SessionPlayer.Listener(" + listener + ")";
                    case "onAvailableCommandsChanged":
                        args[0] = adjust((Commands) args[0]);
                        break;
                    default:
                        break;
                }
                try {
                    return method.invoke(listener, args);
                } catch (InvocationTargetException e) {
                    throw e.getCause();
                }
            }
        );
        wrapped.put(listener, proxy);
        super.addListener(proxy);
    }

    @Override
    public void removeListener(Player.Listener listener) {
        Player.Listener proxy = wrapped.remove(listener);
        super.removeListener(proxy != null ? proxy : listener);
    }
}
