import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { notify } from 'src/utils/helpers';
import { notifyError } from 'src/utils/composer';
import { cancelAgentRunRequest, type AgentRun, type AgentScope } from 'src/utils/requests/agent';

/**
 * Asks before stopping a queued or running agent run, then stops it. Resolves
 * with the stopped run, or null when it was kept or couldn't be stopped.
 */
export const useStopAgentRun = (scope: () => AgentScope) => {
  const $q = useQuasar();
  const stopping = ref<number | null>(null);

  const stop = (run: AgentRun) =>
    new Promise<AgentRun | null>((resolve) => {
      $q.dialog({
        dark: true,
        title: 'Stop this run?',
        message:
          run.status === 'queued'
            ? 'It won\'t start.'
            : 'Steps not started are skipped, and music, artwork or lyrics still being made are stopped with their credits refunded. What\'s already built stays. You can retry it later.',
        cancel: { flat: true, noCaps: true, label: 'Keep going' },
        ok: { unelevated: true, rounded: true, noCaps: true, color: 'red-8', label: 'Stop run' },
      })
        .onOk(async () => {
          stopping.value = run.id;

          try {
            const body = await cancelAgentRunRequest(scope(), run.id).send();
            notify(body.message, 'success');
            resolve(body.data);
          } catch (e) {
            notifyError(e, 'That didn\'t work.');
            resolve(null);
          } finally {
            stopping.value = null;
          }
        })
        .onCancel(() => resolve(null));
    });

  return { stop, stopping };
};
