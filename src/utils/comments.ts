import type { InjectionKey, Ref } from 'vue';
import type { UserComment } from 'src/utils/models';

/** A reply someone else just posted or deleted. */
export type LiveReply = { action: 'posted' | 'deleted'; comment: UserComment };

/** Passes live replies from a conversation down to its comment cards. */
export const liveRepliesKey: InjectionKey<Ref<LiveReply | null>> = Symbol('liveReplies');
