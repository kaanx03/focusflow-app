"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Task } from "@/types";

export default function TaskList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: newTaskTitle.trim(),
        completed: false,
      })
      .select()
      .single();

    if (!error && data) {
      setTasks([data, ...tasks]);
      setNewTaskTitle("");
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        completed: !completed,
        completed_at: !completed ? new Date().toISOString() : null,
      })
      .eq("id", taskId);

    if (!error) {
      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !completed } : task
        )
      );
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (!error) {
      setTasks(tasks.filter((task) => task.id !== taskId));
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
          Today's Tasks
        </h2>
        <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
          {completedCount}/{tasks.length} completed
        </span>
      </div>

      {/* Add Task Form */}
      <form onSubmit={addTask} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition flex items-center gap-2"
          >
            <Plus size={20} />
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-dark-text-secondary">
            <p>No tasks yet. Add one to get started!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition group"
            >
              <button
                onClick={() => toggleTask(task.id, task.completed)}
                className="flex-shrink-0"
              >
                {task.completed ? (
                  <CheckCircle2 className="text-success" size={24} />
                ) : (
                  <Circle
                    className="text-gray-400 dark:text-gray-600"
                    size={24}
                  />
                )}
              </button>

              <span
                className={`flex-1 ${
                  task.completed
                    ? "line-through text-gray-400 dark:text-gray-600"
                    : "text-gray-900 dark:text-dark-text-primary"
                }`}
              >
                {task.title}
              </span>

              <button
                onClick={() => deleteTask(task.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
