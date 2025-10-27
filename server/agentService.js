// agentService.js - Service to manage Agent tasks with persistent storage
const Mem0Service = require('./mem0Service');

class AgentService {
  constructor() {
    this.mem0Service = new Mem0Service();
    this.activeTasks = new Map(); // Store active tasks in memory
    console.log('AgentService initialized');
  }

  // Create a new agent task
  async createTask(taskData) {
    try {
      const taskId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11);
      const task = {
        id: taskId,
        status: 'pending',
        progress: 0,
        result: null,
        error: null,
        message: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...taskData
      };

      // Save task to memory store
      await this.mem0Service.addMemory(JSON.stringify(task), {
        category: 'agent_task',
        taskId: taskId,
        type: 'task_created'
      });

      // Store in active tasks map
      this.activeTasks.set(taskId, task);

      console.log(`Agent task created: ${taskId}`);
      return task;
    } catch (error) {
      console.error('Error creating agent task:', error.message);
      throw error;
    }
  }

  // Update task progress
  async updateTaskProgress(taskId, progress, message = null) {
    try {
      if (!this.activeTasks.has(taskId)) {
        throw new Error(`Task with id ${taskId} not found`);
      }

      const task = this.activeTasks.get(taskId);
      task.progress = progress;
      task.status = progress === 100 ? 'completed' : 'running';
      task.updatedAt = new Date().toISOString();

      if (message) {
        task.message = message;
      }

      // Update in memory store
      const memories = await this.mem0Service.getAllMemories({ category: 'agent_task', taskId: taskId });
      if (memories.memories.length > 0) {
        const memoryId = memories.memories[0].id;
        await this.mem0Service.updateMemory(memoryId, JSON.stringify(task), {
          category: 'agent_task',
          taskId: taskId,
          type: 'task_progress'
        });
      }

      // Emit progress update via WebSocket if available
      if (global.agentSocket) {
        await global.agentSocket.broadcastTaskProgress(taskId, progress, message);
      }

      console.log(`Task ${taskId} progress updated: ${progress}%`);
      return task;
    } catch (error) {
      console.error('Error updating task progress:', error.message);
      throw error;
    }
  }

  // Complete a task with result
  async completeTask(taskId, result) {
    try {
      if (!this.activeTasks.has(taskId)) {
        throw new Error(`Task with id ${taskId} not found`);
      }

      const task = this.activeTasks.get(taskId);
      task.status = 'completed';
      task.progress = 100;
      task.result = result;
      task.updatedAt = new Date().toISOString();

      // Update in memory store
      const memories = await this.mem0Service.getAllMemories({ category: 'agent_task', taskId: taskId });
      if (memories.memories.length > 0) {
        const memoryId = memories.memories[0].id;
        await this.mem0Service.updateMemory(memoryId, JSON.stringify(task), {
          category: 'agent_task',
          taskId: taskId,
          type: 'task_completed'
        });
      }

      // Remove from active tasks
      this.activeTasks.delete(taskId);

      // Emit completion update via WebSocket if available
      if (global.agentSocket) {
        await global.agentSocket.broadcastTaskCompletion(taskId, result);
        await global.agentSocket.broadcastAllTasksUpdate();
      }

      console.log(`Task ${taskId} completed`);
      return task;
    } catch (error) {
      console.error('Error completing task:', error.message);
      throw error;
    }
  }

  // Fail a task with error
  async failTask(taskId, error) {
    try {
      if (!this.activeTasks.has(taskId)) {
        throw new Error(`Task with id ${taskId} not found`);
      }

      const task = this.activeTasks.get(taskId);
      task.status = 'failed';
      task.error = error.message || error;
      task.updatedAt = new Date().toISOString();

      // Update in memory store
      const memories = await this.mem0Service.getAllMemories({ category: 'agent_task', taskId: taskId });
      if (memories.memories.length > 0) {
        const memoryId = memories.memories[0].id;
        await this.mem0Service.updateMemory(memoryId, JSON.stringify(task), {
          category: 'agent_task',
          taskId: taskId,
          type: 'task_failed'
        });
      }

      // Remove from active tasks
      this.activeTasks.delete(taskId);

      // Emit failure update via WebSocket if available
      if (global.agentSocket) {
        await global.agentSocket.broadcastTaskFailure(taskId, error);
        await global.agentSocket.broadcastAllTasksUpdate();
      }

      console.log(`Task ${taskId} failed: ${error.message}`);
      return task;
    } catch (err) {
      console.error('Error failing task:', err.message);
      throw err;
    }
  }

  // Get task by ID
  async getTask(taskId) {
    try {
      // Check active tasks first
      if (this.activeTasks.has(taskId)) {
        return this.activeTasks.get(taskId);
      }

      // Search in memory store
      const memories = await this.mem0Service.getAllMemories({ category: 'agent_task', taskId: taskId });
      if (memories.memories.length > 0) {
        const task = JSON.parse(memories.memories[0].content);
        return task;
      }

      return null;
    } catch (error) {
      console.error('Error getting task:', error.message);
      return null;
    }
  }

  // Get all tasks with optional filters
  async getAllTasks(filters = {}) {
    try {
      const allTasks = [];

      // Add active tasks
      for (const [id, task] of this.activeTasks) {
        allTasks.push(task);
      }

      // Search in memory store
      const memories = await this.mem0Service.getAllMemories({ category: 'agent_task' });
      for (const memory of memories.memories) {
        try {
          const task = JSON.parse(memory.content);
          // Avoid duplicates
          if (!allTasks.some(t => t.id === task.id)) {
            allTasks.push(task);
          }
        } catch (parseError) {
          console.error('Error parsing task from memory:', parseError.message);
        }
      }

      // Apply filters
      let filteredTasks = allTasks;
      if (filters.status) {
        filteredTasks = filteredTasks.filter(task => task.status === filters.status);
      }

      // Sort by creation date (newest first)
      filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return filteredTasks;
    } catch (error) {
      console.error('Error getting all tasks:', error.message);
      return [];
    }
  }

  // Execute a long-running task
  async executeTask(taskId, taskFunction) {
    try {
      const task = this.activeTasks.get(taskId);
      if (!task) {
        throw new Error(`Task with id ${taskId} not found`);
      }

      // Update task status to running
      await this.updateTaskProgress(taskId, 0, 'Task started');

      // Execute the task function
      const result = await taskFunction(
        // Progress callback
        async (progress, message) => {
          // Check if task was cancelled
          const currentTask = this.activeTasks.get(taskId);
          if (currentTask && currentTask.status === 'cancelled') {
            throw new Error('Task was cancelled');
          }

          await this.updateTaskProgress(taskId, progress, message);
        }
      );

      // Complete the task
      await this.completeTask(taskId, result);
      return result;
    } catch (error) {
      // If task was cancelled, update status accordingly
      const currentTask = this.activeTasks.get(taskId);
      if (currentTask && currentTask.status === 'cancelled') {
        await this.updateTaskProgress(taskId, currentTask.progress, 'Task cancelled');
        currentTask.status = 'cancelled';
        currentTask.updatedAt = new Date().toISOString();
        return currentTask;
      }

      // Fail the task
      await this.failTask(taskId, error);
      throw error;
    }
  }

  // Cancel a task
  async cancelTask(taskId) {
    try {
      if (!this.activeTasks.has(taskId)) {
        throw new Error(`Task with id ${taskId} not found`);
      }

      const task = this.activeTasks.get(taskId);
      task.status = 'cancelled';
      task.updatedAt = new Date().toISOString();

      // Update in memory store
      const memories = await this.mem0Service.getAllMemories({ category: 'agent_task', taskId: taskId });
      if (memories.memories.length > 0) {
        const memoryId = memories.memories[0].id;
        await this.mem0Service.updateMemory(memoryId, JSON.stringify(task), {
          category: 'agent_task',
          taskId: taskId,
          type: 'task_cancelled'
        });
      }

      // Emit cancellation update via WebSocket if available
      if (global.agentSocket) {
        await global.agentSocket.broadcastTaskFailure(taskId, new Error('Task was cancelled'));
        await global.agentSocket.broadcastAllTasksUpdate();
      }

      // Remove from active tasks
      this.activeTasks.delete(taskId);

      console.log(`Task ${taskId} cancelled`);
      return task;
    } catch (error) {
      console.error('Error cancelling task:', error.message);
      throw error;
    }
  }
}

module.exports = AgentService;