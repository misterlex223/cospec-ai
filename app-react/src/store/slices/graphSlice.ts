/**
 * Graph Slice - Manages document link graph state
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  type: 'file';
  exists: boolean;
  metadata: {
    size: number;
    modified: string | null;
    tags: string[];
    title: string | null;
  };
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  relationType: string | null;
  bidirectional: boolean;
  metadata?: any;
}

export interface GraphMetadata {
  version: number;
  lastUpdated: string | null;
  totalNodes: number;
  totalEdges: number;
  orphanedNodes: string[];
  brokenLinks: any[];
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

interface GraphState {
  graph: Graph | null;
  selectedNode: string | null;
  viewMode: 'split' | 'fullscreen';
  layout: 'force' | 'hierarchical';
  filters: {
    types: string[];
    showOrphans: boolean;
    connectedTo: string | null;
  };
  loading: boolean;
  error: string | null;
}

const initialState: GraphState = {
  graph: null,
  selectedNode: null,
  viewMode: 'split',
  layout: 'force',
  filters: {
    types: [],
    showOrphans: true,
    connectedTo: null
  },
  loading: false,
  error: null
};

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    setGraph: (state, action: PayloadAction<Graph>) => {
      state.graph = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectedNode: (state, action: PayloadAction<string | null>) => {
      state.selectedNode = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'split' | 'fullscreen'>) => {
      state.viewMode = action.payload;
    },
    setLayout: (state, action: PayloadAction<'force' | 'hierarchical'>) => {
      state.layout = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<GraphState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    addEdge: (state, action: PayloadAction<GraphEdge>) => {
      if (state.graph) {
        state.graph.edges.push(action.payload);
        state.graph.metadata.totalEdges++;
      }
    },
    removeEdge: (state, action: PayloadAction<string>) => {
      if (state.graph) {
        state.graph.edges = state.graph.edges.filter(edge => edge.id !== action.payload);
        state.graph.metadata.totalEdges--;
      }
    },
    updateNode: (state, action: PayloadAction<GraphNode>) => {
      if (state.graph) {
        const index = state.graph.nodes.findIndex(node => node.id === action.payload.id);
        if (index !== -1) {
          state.graph.nodes[index] = action.payload;
        } else {
          state.graph.nodes.push(action.payload);
          state.graph.metadata.totalNodes++;
        }
      }
    },
    removeNode: (state, action: PayloadAction<string>) => {
      if (state.graph) {
        state.graph.nodes = state.graph.nodes.filter(node => node.id !== action.payload);
        state.graph.edges = state.graph.edges.filter(
          edge => edge.from !== action.payload && edge.to !== action.payload
        );
        state.graph.metadata.totalNodes--;
      }
    },
    clearGraph: (state) => {
      state.graph = null;
      state.selectedNode = null;
    }
  }
});

export const {
  setGraph,
  setLoading,
  setError,
  setSelectedNode,
  setViewMode,
  setLayout,
  setFilters,
  addEdge,
  removeEdge,
  updateNode,
  removeNode,
  clearGraph
} = graphSlice.actions;

export default graphSlice.reducer;
