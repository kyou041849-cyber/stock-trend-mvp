import { daysUntil } from "./date-utils";
import type { ConfirmationTask } from "./types";

export function isTaskDone(task: ConfirmationTask): boolean {
  return task.status === "完了";
}

export function isTaskOverdue(task: ConfirmationTask): boolean {
  const diff = daysUntil(task.dueDate);
  return diff !== null && diff < 0 && !isTaskDone(task);
}

export function isTaskDueWithin(task: ConfirmationTask, days: number): boolean {
  const diff = daysUntil(task.dueDate);
  return diff !== null && diff >= 0 && diff <= days && !isTaskDone(task);
}

export function sortTasks(tasks: ConfirmationTask[]): ConfirmationTask[] {
  return [...tasks].sort((a, b) => {
    const statusDiff = Number(isTaskDone(a)) - Number(isTaskDone(b));
    if (statusDiff !== 0) return statusDiff;
    const dueDiff = a.dueDate.localeCompare(b.dueDate);
    if (dueDiff !== 0) return dueDiff;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
