import * as Workflow from './workflow';
import * as TaskC from './constants/task';
import * as WorkflowC from './constants/workflow';

describe('Workflow', () => {
  describe('Create workflow', () => {
    test('Default value', () => {
      expect(
        new Workflow.WorkflowDefinition({
          name: 'hello-world',
          rev: 1,
          tasks: [
            {
              name: 'huhu',
              taskReferenceName: 'HUHU',
              type: TaskC.TaskTypes.SubWorkflow,
              inputParameters: {
                a: 'b',
              },
              workflow: {
                name: 'a',
                rev: 1,
              },
            },
          ],
        }),
      ).toEqual({
        name: 'hello-world',
        rev: 1,
        description: 'No description',
        tasks: [
          {
            inputParameters: {
              a: 'b',
            },
            name: 'huhu',
            taskReferenceName: 'HUHU',
            type: 'SUB_WORKFLOW',
            workflow: {
              name: 'a',
              rev: 1,
            },
          },
        ],
      });
    });

    test('Invalid name', () => {
      expect(
        () =>
          new Workflow.WorkflowDefinition({
            name: '',
            rev: 1,
            tasks: [
              {
                name: 'huhu',
                taskReferenceName: 'HUHU',
                type: TaskC.TaskTypes.Task,
                inputParameters: {
                  a: 'b',
                },
              },
            ],
          }),
      ).toThrow('workflowDefinition.name is invalid');
    });

    test('Invalid rev', () => {
      expect(
        () =>
          new Workflow.WorkflowDefinition({
            name: 'hello-world',
            rev: undefined,
            tasks: [
              {
                name: 'huhu',
                taskReferenceName: 'HUHU',
                type: TaskC.TaskTypes.Task,
                inputParameters: {
                  a: 'b',
                },
              },
            ],
          }),
      ).toThrow('workflowDefinition.rev is invalid');
    });

    test('failureStrategy to "RECOVERY_WORKFLOW" without recoveryWorkflow param', () => {
      expect(
        () =>
          new Workflow.WorkflowDefinition({
            name: 'hello-world',
            rev: 1,
            tasks: [
              {
                name: 'huhu',
                taskReferenceName: 'HUHU',
                type: TaskC.TaskTypes.SubWorkflow,
                inputParameters: {
                  a: 'b',
                },
                workflow: {
                  name: 'a',
                  rev: 1,
                },
              },
            ],
            failureStrategy: WorkflowC.FailureStrategies.RecoveryWorkflow,
          }),
      ).toThrow('workflowDefinition.recoveryWorkflow is invalid');
    });

    test('failureStrategy to "RECOVERY_WORKFLOW" with recoveryWorkflow param', () => {
      expect(
        new Workflow.WorkflowDefinition({
          name: 'hello-world',
          rev: 1,
          tasks: [
            {
              name: 'huhu',
              taskReferenceName: 'HUHU',
              type: TaskC.TaskTypes.SubWorkflow,
              inputParameters: {
                a: 'b',
              },
              workflow: {
                name: 'a',
                rev: 1,
              },
            },
          ],
          failureStrategy: WorkflowC.FailureStrategies.RecoveryWorkflow,
          recoveryWorkflow: {
            name: 'hihi',
            rev: 2,
          },
        }),
      ).toEqual({
        description: 'No description',
        failureStrategy: 'RECOVERY_WORKFLOW',
        name: 'hello-world',
        recoveryWorkflow: {
          name: 'hihi',
          rev: 2,
        },
        rev: 1,
        tasks: [
          {
            inputParameters: {
              a: 'b',
            },
            name: 'huhu',
            taskReferenceName: 'HUHU',
            type: 'SUB_WORKFLOW',
            workflow: {
              name: 'a',
              rev: 1,
            },
          },
        ],
      });
    });

    test('failureStrategy to "RETRY" without retry param', () => {
      expect(
        () =>
          new Workflow.WorkflowDefinition({
            name: 'hello-world',
            rev: 1,
            tasks: [
              {
                name: 'huhu',
                taskReferenceName: 'HUHU',
                type: TaskC.TaskTypes.SubWorkflow,
                inputParameters: {
                  a: 'b',
                },
                workflow: {
                  name: 'a',
                  rev: 1,
                },
              },
            ],
            failureStrategy: WorkflowC.FailureStrategies.Retry,
          }),
      ).toThrow('workflowDefinition.retry is invalid');
    });

    test('failureStrategy to "RETRY" with retry param', () => {
      expect(
        new Workflow.WorkflowDefinition({
          name: 'hello-world',
          rev: 1,
          tasks: [
            {
              name: 'huhu',
              taskReferenceName: 'HUHU',
              type: TaskC.TaskTypes.SubWorkflow,
              inputParameters: {
                a: 'b',
              },
              workflow: {
                name: 'a',
                rev: 1,
              },
            },
          ],
          failureStrategy: WorkflowC.FailureStrategies.Retry,
          retry: {
            delaySecond: 3,
            limit: 2,
          },
        }),
      ).toEqual({
        description: 'No description',
        failureStrategy: 'RETRY',
        name: 'hello-world',
        rev: 1,
        tasks: [
          {
            type: 'SUB_WORKFLOW',
            inputParameters: {
              a: 'b',
            },
            name: 'huhu',
            taskReferenceName: 'HUHU',
            workflow: {
              name: 'a',
              rev: 1,
            },
          },
        ],
        retry: {
          delaySecond: 3,
          limit: 2,
        },
      });
    });

    test('Empty task', () => {
      expect(
        () =>
          new Workflow.WorkflowDefinition({
            name: 'hello-world',
            rev: 1,
            tasks: [],
          }),
      ).toThrow('workflowDefinition.tasks cannot be empty');
    });

    test('Default value', () => {
      expect(
        () =>
          new Workflow.WorkflowDefinition(
            JSON.parse(
              JSON.stringify({
                name: 'hello-world',
                rev: 1,
                tasks: [
                  {
                    name: 'eiei',
                    taskReferenceName: 'eiei',
                    // type: TaskC.TaskTypes.Task,
                    type: 'SOME_RAMDON_TYPE',
                    inputParameters: {},
                  },
                  {
                    // name: 'task002',
                    taskReferenceName: 'lol',
                    type: TaskC.TaskTypes.Decision,
                    inputParameters: {},
                    defaultDecision: [
                      // {
                      //   name: 'default_one',
                      //   taskReferenceName: 'default_one',
                      //   type: TaskC.TaskTypes.Task,
                      //   inputParameters: {},
                      // },
                    ],
                    decisions: {
                      case1: [
                        {
                          name: 'huhu',
                          // taskReferenceName: 'lol_2',
                          taskReferenceName: 'lol',
                          type: TaskC.TaskTypes.Decision,
                          inputParameters: {},
                          defaultDecision: [
                            {
                              name: 'eiei',
                              // taskReferenceName: 'case1_eiei',
                              type: TaskC.TaskTypes.Task,
                              inputParameters: {},
                            },
                          ],
                        },
                      ],
                    },
                  },
                  {
                    name: 'eiei',
                    taskReferenceName: 'PARALLEL_TASK',
                    type: TaskC.TaskTypes.Parallel,
                    inputParameters: {},
                    parallelTasks: [
                      [
                        {
                          name: 'eiei',
                          taskReferenceName: 'parallel_child1',
                          type: TaskC.TaskTypes.Task,
                          inputParameters: {},
                        },
                      ],
                      [
                        {
                          name: 'eiei',
                          taskReferenceName: 'parallel_child2',
                          type: TaskC.TaskTypes.SubWorkflow,
                          inputParameters: {},
                          // workflow: {
                          //   name: 'haha',
                          //   rev: 3,
                          // },
                        },
                        {
                          name: 'eiei',
                          taskReferenceName: 'parallel_child3',
                          type: TaskC.TaskTypes.Task,
                          inputParameters: {},
                        },
                      ],
                    ],
                  },
                ],
              }),
            ),
          ),
      ).toThrow(
        [
          'workflowDefinition.tasks[0].type is invalid',
          'workflowDefinition.tasks[1].name is invalid',
          'workflowDefinition.tasks[1].defaultDecision cannot be empty',
          'workflowDefinition.tasks[1].decisions["case1"].tasks[0].taskReferenceName is duplicated',
          'workflowDefinition.tasks[1].decisions["case1"].tasks[0].defaultDecision.tasks[0].taskReferenceName is invalid',
          'workflowDefinition.tasks[2].parallelTasks[1].tasks[0].workflow.name is invalid',
          'workflowDefinition.tasks[2].parallelTasks[1].tasks[0].workflow.rev is invalid',
        ].join('\n'),
      );
    });
  });
});