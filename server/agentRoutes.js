// agentRoutes.js - API routes for agent functionality
const express = require('express');
const AgentManager = require('./agentManager');
const AgentSocket = require('./agentSocket');

const router = express.Router();
const agentManager = new AgentManager();

// Middleware to access Socket.IO instance
let agentSocket = null;
const setAgentSocket = (socket) => {
  agentSocket = socket;
};

// Create a new file processing task
router.post('/tasks/file-process', async (req, res) => {
  try {
    const { filePath, operation, description } = req.body;

    if (!filePath || !operation) {
      return res.status(400).json({
        error: 'filePath and operation are required'
      });
    }

    // Start the file processing task
    const task = await agentManager.processFileTask({
      filePath,
      operation,
      description
    });

    // If we have a socket instance, broadcast the task creation
    if (agentSocket) {
      await agentSocket.broadcastAllTasksUpdate();
    }

    res.status(201).json({
      success: true,
      task: task
    });
  } catch (error) {
    console.error('Error creating file processing task:', error.message);
    res.status(500).json({
      error: 'Failed to create file processing task: ' + error.message
    });
  }
});

// Create a new content analysis task
router.post('/tasks/content-analysis', async (req, res) => {
  try {
    const { content, analysisType, description } = req.body;

    if (!content || !analysisType) {
      return res.status(400).json({
        error: 'content and analysisType are required'
      });
    }

    // Start the content analysis task
    const task = await agentManager.analyzeContentTask({
      content,
      analysisType,
      description
    });

    // If we have a socket instance, broadcast the task creation
    if (agentSocket) {
      await agentSocket.broadcastAllTasksUpdate();
    }

    res.status(201).json({
      success: true,
      task: task
    });
  } catch (error) {
    console.error('Error creating content analysis task:', error.message);
    res.status(500).json({
      error: 'Failed to create content analysis task: ' + error.message
    });
  }
});

// Get task status
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await agentManager.getTaskStatus(taskId);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      task: task
    });
  } catch (error) {
    console.error('Error getting task status:', error.message);
    res.status(500).json({
      error: 'Failed to get task status: ' + error.message
    });
  }
});

// Get all tasks with optional filters
router.get('/tasks', async (req, res) => {
  try {
    const { status } = req.query;
    const filters = {};

    if (status) {
      filters.status = status;
    }

    const tasks = await agentManager.getAllTasks(filters);

    res.json({
      success: true,
      tasks: tasks
    });
  } catch (error) {
    console.error('Error getting tasks:', error.message);
    res.status(500).json({
      error: 'Failed to get tasks: ' + error.message
    });
  }
});

// Cancel a task (if it's running)
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    // Call the agentManager to cancel the task
    const result = await agentManager.cancelTask(taskId);

    // If we have a socket instance, broadcast the task update
    if (agentSocket) {
      await agentSocket.broadcastAllTasksUpdate();
    }

    res.json({
      success: true,
      message: `Task ${taskId} cancellation requested`,
      task: result
    });
  } catch (error) {
    console.error('Error cancelling task:', error.message);
    res.status(500).json({
      error: 'Failed to cancel task: ' + error.message
    });
  }
});

module.exports = {
  router,
  setAgentSocket
};