"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Circle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Task } from "@/types";

export default function TaskList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskEstimate, setNewTaskEstimate] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
        estimated_pomodoros: newTaskEstimate,
      })
      .select()
      .single();

    if (!error && data) {
      setTasks([data, ...tasks]);
      setNewTaskTitle("");
      setNewTaskEstimate(1);
    }
  };

  const updateEstimate = async (taskId: string, estimate: number) => {
    if (estimate < 1) return;

    const { error } = await supabase
      .from("tasks")
      .update({ estimated_pomodoros: estimate })
      .eq("id", taskId);

    if (!error) {
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, estimated_pomodoros: estimate } : t
        )
      );
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
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-4 xs:p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg xs:text-xl font-bold text-gray-900 dark:text-dark-text-primary">
          Today's Tasks
        </h2>
        <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
          {completedCount}/{tasks.length} completed
        </span>
      </div>

      {/* Add Task Button */}
      <button
        onClick={() => setEditingTask({} as Task)}
        className="w-full mb-4 px-4 py-3 bg-primary hover:bg-blue-600 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
      >
        <Plus size={20} />
        Add New Task
      </button>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-6 xs:py-8 text-sm text-gray-500 dark:text-dark-text-secondary">
            <p>No tasks yet. Add one to get started!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setEditingTask(task)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition group cursor-pointer"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTask(task.id, task.completed);
                }}
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

              <div className="flex-1 flex items-center justify-between">
                <span
                  className={`${
                    task.completed
                      ? "line-through text-gray-400 dark:text-gray-600"
                      : "text-gray-900 dark:text-dark-text-primary"
                  }`}
                >
                  {task.title}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {task.pomodoro_count}/{task.estimated_pomodoros}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Edit/Add Modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(updatedTask) => {
            setEditingTask(null);
            // Immediately update UI after closing modal
            setTasks((currentTasks) => {
              const existingIndex = currentTasks.findIndex(
                (t) => t.id === updatedTask.id
              );
              if (existingIndex !== -1) {
                // Update existing task
                const newTasks = [...currentTasks];
                newTasks[existingIndex] = updatedTask;
                return newTasks;
              } else {
                // Add new task at the beginning
                return [updatedTask, ...currentTasks];
              }
            });
          }}
          onDelete={(taskId) => {
            setEditingTask(null);
            setTasks((currentTasks) => currentTasks.filter((t) => t.id !== taskId));
          }}
        />
      )}
    </div>
  );
}

// Task Modal Component
function TaskModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task.title || "");
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(
    task.estimated_pomodoros || 1
  );
  const isNewTask = !task.id;

  const handleSave = async () => {
    if (!title.trim() || !user) return;

    if (isNewTask) {
      // Create new task
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: title.trim(),
          completed: false,
          estimated_pomodoros: estimatedPomodoros,
        })
        .select()
        .single();

      if (!error && data) {
        onSave(data);
      }
    } else {
      // Update existing task
      const { data, error } = await supabase
        .from("tasks")
        .update({
          title: title.trim(),
          estimated_pomodoros: estimatedPomodoros,
        })
        .eq("id", task.id)
        .select()
        .single();

      if (!error && data) {
        onSave(data);
      }
    }
  };

  const handleDelete = async () => {
    if (!task.id) return;
    await supabase.from("tasks").delete().eq("id", task.id);
    onDelete(task.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
            {isNewTask ? "Add New Task" : task.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Task Title Input */}
        <div className="mb-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task name..."
            autoFocus
            className="w-full px-4 py-3 text-lg border-b-2 border-gray-300 dark:border-dark-border bg-transparent text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:outline-none"
          />
        </div>

        {/* Pomodoro Estimate */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Act / Est Pomodoros
          </label>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={task.pomodoro_count || 0}
                disabled
                className="w-20 px-3 py-2 text-center text-lg border border-gray-300 dark:border-dark-border bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg"
              />
              <span className="text-gray-400">/</span>
              <input
                type="number"
                min="1"
                max="99"
                value={estimatedPomodoros}
                onChange={(e) =>
                  setEstimatedPomodoros(parseInt(e.target.value) || 1)
                }
                className="w-20 px-3 py-2 text-center text-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setEstimatedPomodoros(Math.max(1, estimatedPomodoros - 1))
                }
                className="w-10 h-10 flex items-center justify-center border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() =>
                  setEstimatedPomodoros(Math.min(99, estimatedPomodoros + 1))
                }
                className="w-10 h-10 flex items-center justify-center border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                ▲
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isNewTask && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex items-center gap-2"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 px-6 py-3 bg-primary hover:bg-blue-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
