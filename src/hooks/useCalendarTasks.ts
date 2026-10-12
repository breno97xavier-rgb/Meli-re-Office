import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTasksData, updateTask } from '../services/tasksService';
import type { Task, TaskClient, TaskInput } from '../types/tasks';

export function useCalendarTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<TaskClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const request = ++sequence.current; setLoading(true); setError(null);
    try { const data = await fetchTasksData(); if (request === sequence.current) { setTasks(data.tasks); setClients(data.clients); } }
    catch (failure) { if (request === sequence.current) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar as tarefas.'); }
    finally { if (request === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => { reload(); return () => { sequence.current += 1; }; }, [reload]);
  const save = async (id: string, input: TaskInput) => {
    const updated = await updateTask(id, input);
    setTasks(previous => previous.map(task => task.id === updated.id ? updated : task));
    return updated;
  };
  return { tasks, clients, loading, error, reload, save };
}
