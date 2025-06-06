/**
 * Workflow Status Subscriber.
 *
 * Monitors changes in the workflow status, logging significant events and updating the system state accordingly.
 * This is crucial for maintaining a clear overview of workflow progress and handling potential issues promptly.
 *
 * Usage:
 * Use this subscriber to keep track of workflow statuses, enabling proactive management of workflows and their states.
 */

import {
  logPrettyWorkflowStatus,
  logPrettyWorkflowResult,
} from '../utils/prettyLogs';
import { WORKFLOW_STATUS_enum } from '../utils/enums';
import { TeamStore } from '../stores';
import { CombinedStoresState } from '../stores/teamStore.types';
import { WorkflowLog, WorkflowFinishedLog } from '../types/logs';

/**
 * Subscribes to workflow status updates and logs them appropriately.
 * @param useStore - The store instance to subscribe to
 */
const subscribeWorkflowStatusUpdates = (useStore: TeamStore): void => {
  useStore.subscribe(
    (state: CombinedStoresState) => state.workflowLogs,
    // @ts-expect-error: Zustand subscribe overload is not properly typed
    (newLogs: WorkflowLog[], previousLogs: WorkflowLog[]) => {
      if (newLogs.length > previousLogs.length) {
        const newLog = newLogs[newLogs.length - 1];
        if (newLog.logType === 'WorkflowStatusUpdate') {
          switch (newLog.workflowStatus) {
            case WORKFLOW_STATUS_enum.INITIAL:
              logPrettyWorkflowStatus({
                status: WORKFLOW_STATUS_enum.INITIAL,
                message: 'Workflow is being initialized.',
              });
              break;
            case WORKFLOW_STATUS_enum.RUNNING:
              logPrettyWorkflowStatus({
                status: WORKFLOW_STATUS_enum.RUNNING,
                message: 'Workflow is actively processing tasks.',
              });
              break;
            case WORKFLOW_STATUS_enum.STOPPING:
              logPrettyWorkflowStatus({
                status: WORKFLOW_STATUS_enum.STOPPING,
                message: 'Workflow is stopping.',
              });
              break;
            case WORKFLOW_STATUS_enum.STOPPED:
              logPrettyWorkflowStatus({
                status: WORKFLOW_STATUS_enum.STOPPED,
                message: 'Workflow has been stopped.',
              });
              break;
            case WORKFLOW_STATUS_enum.ERRORED:
              logPrettyWorkflowStatus({
                status: WORKFLOW_STATUS_enum.ERRORED,
                message: 'Workflow encountered an error.',
              });
              break;
            case WORKFLOW_STATUS_enum.FINISHED:
              logPrettyWorkflowStatus({
                status: WORKFLOW_STATUS_enum.FINISHED,
                message: 'Workflow has successfully completed all tasks.',
              });
              logPrettyWorkflowResult(newLog as WorkflowFinishedLog);
              break;
            case WORKFLOW_STATUS_enum.BLOCKED:
              logPrettyWorkflowStatus({
                status: WORKFLOW_STATUS_enum.BLOCKED,
                message:
                  'Workflow is blocked due to one or more blocked tasks.',
              });
              break;
            case WORKFLOW_STATUS_enum.RESUMED:
              logPrettyWorkflowStatus({
                status: WORKFLOW_STATUS_enum.RESUMED,
                message: 'Workflow has been resumed.',
              });
              break;
            case WORKFLOW_STATUS_enum.PAUSED:
              logPrettyWorkflowStatus({
                status: WORKFLOW_STATUS_enum.PAUSED,
                message: 'Workflow has been paused.',
              });
              break;
            default:
              console.warn(
                `Encountered an unexpected workflow status: ${
                  (newLog as WorkflowLog).workflowStatus
                }`
              );
              break;
          }
        }
      }
    }
  );
};

export { subscribeWorkflowStatusUpdates };
