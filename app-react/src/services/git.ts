/**
 * Git API Service
 *
 * Frontend API functions for Git operations
 */

import axios from 'axios';
import type {
  GitBranch,
  GitCommit,
  GitDiffResult,
  GitStatusResult,
} from '../types/git';

const API_KEY = 'demo-api-key';
const baseURL = import.meta.env.MODE === 'production' ? './api' : '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${API_KEY}`;
  return config;
});

export const getStatus = async (): Promise<GitStatusResult> => {
  const { data } = await api.get<GitStatusResult>('/git/status');
  return data;
};

/**
 * Get commit history
 */
export const getLog = async (limit = 20, offset = 0): Promise<{ success: boolean; commits: GitCommit[] }> => {
  const response = await api.get('/git/log', { params: { limit, offset } });
  return response.data;
};

/**
 * Get single commit details
 */
export const getCommit = async (id: string): Promise<{ success: boolean; commit: GitCommit }> => {
  const response = await api.get(`/git/commit/${id}`);
  return response.data;
};

/**
 * Get diff between files or revisions
 */
export const getDiff = async (pathA?: string, pathB?: string): Promise<GitDiffResult> => {
  const response = await api.get('/git/diff', { params: { pathA, pathB } });
  return response.data;
};

/**
 * Get all branches
 */
export const getBranches = async (): Promise<{ success: boolean; branches: GitBranch[]; current: string | null }> => {
  const response = await api.get('/git/branches');
  return response.data;
};

/**
 * Stage files for commit
 */
export const stageFiles = async (files: string[]): Promise<{ success: boolean }> => {
  const response = await api.post('/git/stage', { files });
  return response.data;
};

/**
 * Commit staged changes
 */
export const commitFiles = async (message: string): Promise<{ success: boolean; commit?: GitCommit }> => {
  const response = await api.post('/git/commit', { message });
  return response.data;
};
