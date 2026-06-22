import { isTaskDone, isTaskDueWithin, isTaskOverdue, sortTasks } from "@/lib/taskFilters";
import type { ConfirmationTask, EarningsCalendarItem, StockProfile } from "@/lib/types";

function createTaskId(stockId: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `task-${stockId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getAllConfirmationTasks(stocks: StockProfile[]): Array<{ stock: StockProfile; task: ConfirmationTask }> {
  return stocks
    .flatMap((stock) => stock.confirmationTasks.map((task) => ({ stock, task })))
    .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
}

export function getIncompleteTasks(tasks: ConfirmationTask[]): ConfirmationTask[] {
  return tasks.filter((task) => !isTaskDone(task));
}

export function getOverdueTasks(stocks: StockProfile[]): Array<{ stock: StockProfile; task: ConfirmationTask }> {
  return getAllConfirmationTasks(stocks).filter(({ task }) => isTaskOverdue(task));
}

export function getUpcomingTasks(stocks: StockProfile[], days = 7): Array<{ stock: StockProfile; task: ConfirmationTask }> {
  return getAllConfirmationTasks(stocks).filter(({ task }) => isTaskDueWithin(task, days));
}

export function getHighPriorityOpenTasks(stocks: StockProfile[]): Array<{ stock: StockProfile; task: ConfirmationTask }> {
  return getAllConfirmationTasks(stocks).filter(({ task }) => task.priority === "高" && !isTaskDone(task));
}

export function sortConfirmationTasks(tasks: ConfirmationTask[]): ConfirmationTask[] {
  return sortTasks(tasks);
}

export function createTaskFromEarningsCalendar(stock: StockProfile, item: EarningsCalendarItem, mode: "before" | "after" = "after"): ConfirmationTask {
  const now = new Date().toISOString();
  const dueDate = mode === "before" ? addDays(item.earningsDate, -1) : addDays(item.earningsDate, 1);

  return {
    id: createTaskId(stock.id),
    stockId: stock.id,
    ticker: stock.ticker,
    companyName: stock.companyName,
    title: mode === "before" ? "決算発表日を再確認" : "決算内容を確認",
    dueDate,
    taskType: "決算確認",
    priority: mode === "before" ? "中" : "高",
    status: "未着手",
    memo: `${item.earningsDate} ${item.fiscalYear} ${item.fiscalQuarter} の決算予定に関連する確認タスクです。`,
    createdAt: now,
    updatedAt: now,
  };
}
