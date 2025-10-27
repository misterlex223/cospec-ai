// agentSocket.js - WebSocket functionality for agent task progress updates
const AgentService = require('./agentService');

class AgentSocket {
  constructor(io) {
    this.io = io;
    this.agentService = new AgentService();
    this.setupSocketHandlers();
    console.log('AgentSocket initialized');
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Agent client connected:', socket.id);

      // Listen for task progress subscription
      socket.on('subscribe-to-task', async (taskId) => {
        console.log(`Client ${socket.id} subscribed to task ${taskId}`);
        socket.join(`task-${taskId}`);
      });

      // Listen for task progress unsubscription
      socket.on('unsubscribe-from-task', (taskId) => {
        console.log(`Client ${socket.id} unsubscribed from task ${taskId}`);
        socket.leave(`task-${taskId}`);
      });

      // Listen for all tasks subscription
      socket.on('subscribe-to-all-tasks', () => {
        console.log(`Client ${socket.id} subscribed to all tasks`);
        socket.join('all-tasks');
      });

      // Listen for all tasks unsubscription
      socket.on('unsubscribe-from-all-tasks', () => {
        console.log(`Client ${socket.id} unsubscribed from all tasks`);
        socket.leave('all-tasks');
      });

      socket.on('disconnect', () => {
        console.log('Agent client disconnected:', socket.id);
      });
    });
  }

  // Broadcast task progress to subscribed clients
  async broadcastTaskProgress(taskId, progress, message = null) {
    try {
      // Get the latest task information
      const task = await this.agentService.getTask(taskId);
      if (!task) {
        console.warn(`Task ${taskId} not found for progress broadcast`);
        return;
      }

      // Prepare progress update
      const progressUpdate = {
        taskId,
        progress: progress,
        message: message,
        status: task.status,
        updatedAt: new Date().toISOString()
      };

      // Emit to clients subscribed to this specific task
      this.io.to(`task-${taskId}`).emit('task-progress', progressUpdate);

      // Also emit to clients subscribed to all tasks
      this.io.to('all-tasks').emit('task-progress', progressUpdate);

      console.log(`Broadcasted progress for task ${taskId}: ${progress}%`);
    } catch (error) {
      console.error('Error broadcasting task progress:', error.message);
    }
  }

  // Broadcast task completion to subscribed clients
  async broadcastTaskCompletion(taskId, result) {
    try {
      // Get the latest task information
      const task = await this.agentService.getTask(taskId);
      if (!task) {
        console.warn(`Task ${taskId} not found for completion broadcast`);
        return;
      }

      // Prepare completion update
      const completionUpdate = {
        taskId,
        status: 'completed',
        result: result,
        updatedAt: new Date().toISOString()
      };

      // Emit to clients subscribed to this specific task
      this.io.to(`task-${taskId}`).emit('task-completed', completionUpdate);

      // Also emit to clients subscribed to all tasks
      this.io.to('all-tasks').emit('task-completed', completionUpdate);

      console.log(`Broadcasted completion for task ${taskId}`);
    } catch (error) {
      console.error('Error broadcasting task completion:', error.message);
    }
  }

  // Broadcast task failure to subscribed clients
  async broadcastTaskFailure(taskId, error) {
    try {
      // Get the latest task information
      const task = await this.agentService.getTask(taskId);
      if (!task) {
        console.warn(`Task ${taskId} not found for failure broadcast`);
        return;
      }

      // Prepare failure update
      const failureUpdate = {
        taskId,
        status: 'failed',
        error: error.message || error,
        updatedAt: new Date().toISOString()
      };

      // Emit to clients subscribed to this specific task
      this.io.to(`task-${taskId}`).emit('task-failed', failureUpdate);

      // Also emit to clients subscribed to all tasks
      this.io.to('all-tasks').emit('task-failed', failureUpdate);

      console.log(`Broadcasted failure for task ${taskId}: ${error.message}`);
    } catch (err) {
      console.error('Error broadcasting task failure:', err.message);
    }
  }

  // Broadcast all tasks update
  async broadcastAllTasksUpdate() {
    try {
      const tasks = await this.agentService.getAllTasks();

      // Emit to clients subscribed to all tasks
      this.io.to('all-tasks').emit('all-tasks-update', tasks);

      console.log('Broadcasted all tasks update');
    } catch (error) {
      console.error('Error broadcasting all tasks update:', error.message);
    }
  }
}

module.exports = AgentSocket;