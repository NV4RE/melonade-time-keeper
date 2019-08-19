import * as R from 'ramda';
import { TaskStates, TaskNextStates, TaskTypes } from './constants/task';
import { concatArray } from './utils/common';
import { poll, consumerClient } from './kafka';
import { taskInstanceStore, workflowInstanceStore } from './store';
import {
  AllTaskType,
  IParallelTask,
  IDecisionTask,
  WorkflowDefinition,
} from './workflowDefinition';
import { Workflow } from './workflow';
import { ITask, Task } from './task';

export interface ITaskUpdate {
  taskId: string;
  status: TaskStates;
  output?: any;
  logs?: any[] | any;
}

export const isAbleToTranslateTaskStatus = (
  currentStatus: TaskStates,
  status: TaskStates,
): boolean => {
  if (TaskNextStates[currentStatus]) {
    if (TaskNextStates[currentStatus].includes(status)) return true;
    return false;
  }
  throw new Error(`Current status: "${currentStatus}" is invalid`);
};

export const processTask = (task: ITask, taskUpdate: ITaskUpdate): ITask => {
  if (!isAbleToTranslateTaskStatus(task.status, taskUpdate.status))
    throw new Error(
      `Cannot change status from ${task.status} to ${taskUpdate.status}`,
    );

  task.status = taskUpdate.status;
  task.output = R.isNil(taskUpdate.output) ? task.output : taskUpdate.output;
  task.logs = concatArray(task.logs, taskUpdate.logs);
  return task;
};

const getNextPath = (currentPath: (string | number)[]): (string | number)[] => [
  ...R.init(currentPath),
  +R.last(currentPath) + 1,
];

const isChildOfDecisionDefault = (
  tasks: AllTaskType[],
  currentPath: (string | number)[],
): boolean =>
  R.pathEq(
    [...R.dropLast(2, currentPath), 'type'],
    TaskTypes.Decision,
    tasks,
  ) && R.nth(-2, currentPath) === 'defaultDecision';

const isChildOfDecisionCase = (
  tasks: AllTaskType[],
  currentPath: (string | number)[],
): boolean =>
  R.pathEq(
    [...R.dropLast(3, currentPath), 'type'],
    TaskTypes.Decision,
    tasks,
  ) && R.nth(-3, currentPath) === 'decisions';

// Check if it's system task
export const getNextTaskPath = (
  tasks: AllTaskType[],
  currentPath: (string | number)[],
): (string | number)[] => {
  // Check if this's the final task
  if (R.equals([tasks.length - 1], currentPath)) return null;

  switch (true) {
    case !!R.path(getNextPath(currentPath), tasks):
      return getNextPath(currentPath);
    case R.pathEq(
      [...R.dropLast(2, currentPath), 'type'],
      TaskTypes.Parallel,
      tasks,
    ):
      // TODO Check if all child are completed
      return getNextPath(R.init(currentPath));
    case isChildOfDecisionDefault(tasks, currentPath):
      return getNextTaskPath(tasks, R.dropLast(2, currentPath));
    case isChildOfDecisionCase(tasks, currentPath):
      return getNextTaskPath(tasks, R.dropLast(3, currentPath));
    // This case should never fall
    default:
      throw new Error('Task is invalid');
  }
};

export const findNextParallelTaskPath = (
  taskReferenceName: string,
  tasks: AllTaskType[],
  currentPath: (string | number)[],
  currentTask: IParallelTask,
) => {
  for (
    let pTasksIndex = 0;
    pTasksIndex < currentTask.parallelTasks.length;
    pTasksIndex++
  ) {
    const taskPath = findTaskPath(taskReferenceName, tasks, [
      ...currentPath,
      'parallelTasks',
      pTasksIndex,
      0,
    ]);
    if (taskPath) return taskPath;
  }
  return findTaskPath(taskReferenceName, tasks, getNextPath(currentPath));
};

export const findNextDecisionTaskPath = (
  taskReferenceName: string,
  tasks: AllTaskType[],
  currentPath: (string | number)[],
  currentTask: IDecisionTask,
) => {
  const decisionsPath = [
    ...Object.keys(currentTask.decisions).map((decision: string) => [
      'decisions',
      decision,
    ]),
    ['defaultDecision'],
  ];
  for (const decisionPath of decisionsPath) {
    const taskPath = findTaskPath(taskReferenceName, tasks, [
      ...currentPath,
      ...decisionPath,
      0,
    ]);
    if (taskPath) return taskPath;
  }
  return findTaskPath(taskReferenceName, tasks, getNextPath(currentPath));
};

export const getWorkflowTask = (
  taskReferenceName: string,
  workflowDefinition: WorkflowDefinition,
): AllTaskType => {
  const taskPath = findTaskPath(taskReferenceName, workflowDefinition.tasks);
  if (!taskPath)
    throw new Error(`taskReferenceName: "${taskReferenceName}" not found`);
  return R.path(taskPath, workflowDefinition.tasks);
};

export const findTaskPath = (
  taskReferenceName: string,
  tasks: AllTaskType[],
  currentPath: (string | number)[] = [0],
): (string | number)[] => {
  const currentTask: AllTaskType = R.path(currentPath, tasks);
  if (currentTask)
    if (currentTask.taskReferenceName === taskReferenceName) return currentPath;
    else
      switch (currentTask.type) {
        case TaskTypes.Parallel:
          return findNextParallelTaskPath(
            taskReferenceName,
            tasks,
            currentPath,
            currentTask,
          );
        case TaskTypes.Decision:
          return findNextDecisionTaskPath(
            taskReferenceName,
            tasks,
            currentPath,
            currentTask,
          );
        case TaskTypes.SubWorkflow:
        case TaskTypes.Task:
        default:
          return findTaskPath(
            taskReferenceName,
            tasks,
            getNextPath(currentPath),
          );
      }
  else return null;
};

const getTaskData = async (
  workflow: Workflow,
): Promise<{ [taskReferenceName: string]: Task }> => {
  const taskRefsPairs: [string, string][] = R.toPairs(workflow.taskRefs);
  const taskDataPairs = await Promise.all(
    taskRefsPairs.map(
      async ([taskReferenceName, taskId]: [string, string]): Promise<
        [string, Task]
      > => [taskReferenceName, await taskInstanceStore.getValue(taskId)],
    ),
  );
  return R.fromPairs(taskDataPairs);
};

export const executor = async () => {
  try {
    const tasksUpdate: ITaskUpdate[] = await poll(consumerClient);
    for (const taskUpdate of tasksUpdate) {
      const task: Task = await taskInstanceStore.getValue(taskUpdate.taskId);
      const workflow: Workflow = await workflowInstanceStore.getValue(
        task.workflowId,
      );

      processTask(task, taskUpdate);

      await taskInstanceStore.setValue(task.taskId, task);
      if (taskUpdate.status === TaskStates.Completed) {
        const currentTaskPath = findTaskPath(
          task.taskReferenceName,
          workflow.workflowDefinition.tasks,
        );
        const nextTaskPath = getNextTaskPath(
          workflow.workflowDefinition.tasks,
          currentTaskPath,
        );
        if (nextTaskPath) {
          const taskData = await getTaskData(workflow);
          await workflow.startTask(nextTaskPath, taskData);
        } else {
          // When workflow is completed
          await workflow.destroy();
        }
      }
    }
    consumerClient.commit();
  } catch (error) {
    // Handle error here
    console.log(error);
  } finally {
    setImmediate(executor);
  }
};
