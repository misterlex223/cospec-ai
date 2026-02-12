/**
 * GraphView Component - Document relationship graph visualization
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setGraph, setLoading, setError } from '../../store/slices/graphSlice';
import { openTab, switchTab } from '../../store/slices/tabsSlice';
import { addNotification } from '../../store/slices/notificationsSlice';
import { graphApi, fileApi } from '../../services/api';
import { Network, Maximize2, Minimize2, Filter, LayoutGrid, GitBranch, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import './GraphView.css';

interface GraphViewProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const GraphView: React.FC<GraphViewProps> = ({ isFullscreen = false, onToggleFullscreen }) => {
  const dispatch = useAppDispatch();
  const { graph, loading, error } = useAppSelector((state) => state.graph);
  const { activeTabIndex, openTabs } = useAppSelector((state) => state.tabs);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showOnlyConnected, setShowOnlyConnected] = useState(false);
  const [showOrphans, setShowOrphans] = useState(true);
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [addLinkForm, setAddLinkForm] = useState({
    source: '',
    target: '',
    relationType: ''
  });

  // Load graph data
  useEffect(() => {
    const loadGraph = async () => {
      dispatch(setLoading(true));
      try {
        const graphData = await graphApi.getGraph();
        dispatch(setGraph(graphData));
      } catch (err: any) {
        dispatch(setError(err.message || 'Failed to load graph'));
      }
    };

    loadGraph();
  }, [dispatch]);

  // Convert graph data to React Flow format
  useEffect(() => {
    if (!graph) return;

    const currentFile = activeTabIndex >= 0 ? openTabs[activeTabIndex]?.filePath : null;

    // Filter nodes based on settings
    let filteredNodes = graph.nodes;

    if (!showOrphans) {
      const connectedNodeIds = new Set<string>();
      graph.edges.forEach(edge => {
        connectedNodeIds.add(edge.from);
        connectedNodeIds.add(edge.to);
      });
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
    }

    if (showOnlyConnected && currentFile) {
      const connectedToCurrentFile = new Set<string>([currentFile]);
      graph.edges.forEach(edge => {
        if (edge.from === currentFile) connectedToCurrentFile.add(edge.to);
        if (edge.to === currentFile) connectedToCurrentFile.add(edge.from);
      });
      filteredNodes = filteredNodes.filter(node => connectedToCurrentFile.has(node.id));
    }

    // Convert nodes
    const flowNodes: Node[] = filteredNodes.map((node, index) => {
      const isActive = node.id === currentFile;
      const isMissing = !node.exists;

      return {
        id: node.id,
        type: 'default',
        data: {
          label: node.label,
          filePath: node.path
        },
        position: {
          x: (index % 5) * 200,
          y: Math.floor(index / 5) * 100
        },
        style: {
          background: isActive ? '#4a9eff' : isMissing ? '#ffcccc' : '#ffffff',
          border: isActive ? '2px solid #2563eb' : isMissing ? '2px solid #ff6b6b' : '1px solid #ddd',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          color: isActive ? '#ffffff' : '#333',
          fontWeight: isActive ? 'bold' : 'normal',
          opacity: isMissing ? 0.6 : 1,
          cursor: 'grab'
        }
      };
    });

    // Filter edges
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = graph.edges.filter(edge =>
      nodeIds.has(edge.from) && nodeIds.has(edge.to)
    );

    // Convert edges
    const flowEdges: Edge[] = filteredEdges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'smoothstep',
      animated: edge.relationType !== null,
      label: edge.relationType || undefined,
      style: {
        stroke: edge.relationType ? '#4a9eff' : '#999',
        strokeWidth: edge.relationType ? 2 : 1
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.relationType ? '#4a9eff' : '#999'
      },
      labelStyle: {
        fontSize: '10px',
        fill: '#666'
      }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [graph, activeTabIndex, openTabs, showOrphans, showOnlyConnected, setNodes, setEdges]);

  // Handle node click - only open with Alt key
  const onNodeClick = useCallback(async (_event: React.MouseEvent, node: Node) => {
    // Only open file if Alt key is pressed
    if (!_event.altKey) {
      return;
    }

    const filePath = (node.data.filePath as string) || node.id;
    // Ctrl/Cmd+Alt opens in new tab, Alt alone uses smart mode
    const mode = (_event.ctrlKey || _event.metaKey ? 'new' : 'smart') as 'new' | 'replace' | 'smart';

    // Check if tab already exists and just activate it for smart mode
    if (mode === 'smart') {
      const existingTab = openTabs.find(tab => tab.filePath === filePath);
      if (existingTab) {
        // Tab already exists, just switch to it
        const tabIndex = openTabs.indexOf(existingTab);
        dispatch(switchTab(tabIndex));
        return;
      }
    }

    // Load file content before opening tab
    try {
      const response = await fileApi.getFileContent(filePath);
      dispatch(openTab({ filePath, content: response.content, mode }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: error.message || 'Failed to open file',
        title: 'Open Error'
      }));
    }
  }, [dispatch, openTabs]);

  // Handle add link
  const handleAddLink = async () => {
    if (!addLinkForm.source || !addLinkForm.target) {
      dispatch(addNotification({
        type: 'error',
        message: 'Please select both source and target files',
        title: 'Add Link Error'
      }));
      return;
    }

    try {
      await graphApi.addLink(
        addLinkForm.source,
        addLinkForm.target,
        'wikilink',
        addLinkForm.relationType || undefined
      );

      dispatch(addNotification({
        type: 'success',
        message: 'Link added successfully',
        title: 'Success'
      }));

      // Reload graph
      const graphData = await graphApi.getGraph();
      dispatch(setGraph(graphData));

      // Reset form and close dialog
      setAddLinkForm({ source: '', target: '', relationType: '' });
      setShowAddLinkDialog(false);
    } catch (err: any) {
      dispatch(addNotification({
        type: 'error',
        message: err.message || 'Failed to add link',
        title: 'Add Link Error'
      }));
    }
  };

  // Handle delete edge
  const handleDeleteEdge = async (edgeId: string) => {
    const edge = graph?.edges.find(e => e.id === edgeId);
    if (!edge) return;

    if (!confirm(`Delete link from "${edge.from}" to "${edge.to}"?`)) {
      return;
    }

    try {
      await graphApi.removeLink(edge.from, edge.to);

      dispatch(addNotification({
        type: 'success',
        message: 'Link deleted successfully',
        title: 'Success'
      }));

      // Reload graph
      const graphData = await graphApi.getGraph();
      dispatch(setGraph(graphData));
    } catch (err: any) {
      dispatch(addNotification({
        type: 'error',
        message: err.message || 'Failed to delete link',
        title: 'Delete Link Error'
      }));
    }
  };

  // Handle edge click for deletion
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    handleDeleteEdge(edge.id);
  }, [graph]);

  if (loading) {
    return (
      <div className="graph-view-loading">
        <Network className="spin" size={32} />
        <p>Loading graph...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-view-error">
        <p>Error loading graph: {error}</p>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="graph-view-empty">
        <Network size={48} />
        <p>No documents with links found</p>
        <p className="graph-view-hint">
          Create links using [[document]] syntax in your markdown files
        </p>
        <p className="graph-view-hint" style={{ fontSize: '11px', marginTop: '8px', color: '#999' }}>
          Tip: Alt+Click on nodes to open documents
        </p>
      </div>
    );
  }

  return (
    <div className={`graph-view ${isFullscreen ? 'graph-view-fullscreen' : ''}`}>
      <div className="graph-view-header">
        <div className="graph-view-title">
          <Network size={16} />
          <span>Document Graph</span>
        </div>
        <div className="graph-view-stats" title="Alt+Click on nodes to open documents">
          {nodes.length} nodes • {edges.length} links
        </div>

        <div className="graph-view-controls">
          <button
            className="graph-control-btn"
            onClick={() => setShowAddLinkDialog(true)}
            title="Add manual link"
          >
            <Plus size={16} />
          </button>
          <button
            className={`graph-control-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle filters"
          >
            <Filter size={16} />
          </button>
        </div>

        {onToggleFullscreen && (
          <button
            className="graph-view-fullscreen-btn"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen (Alt+G)' : 'Fullscreen (Alt+G)'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>

      {showFilters && (
        <div className="graph-view-filters">
          <label className="graph-filter-item">
            <input
              type="checkbox"
              checked={showOnlyConnected}
              onChange={(e) => setShowOnlyConnected(e.target.checked)}
              disabled={activeTabIndex < 0}
            />
            <span>Show only connected to active file</span>
          </label>
          <label className="graph-filter-item">
            <input
              type="checkbox"
              checked={showOrphans}
              onChange={(e) => setShowOrphans(e.target.checked)}
            />
            <span>Show orphaned files</span>
          </label>
        </div>
      )}
      <div className="graph-view-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          fitView
          minZoom={0.1}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const style = node.style as any;
              return style?.background || '#ffffff';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      {/* Add Link Dialog */}
      {showAddLinkDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setShowAddLinkDialog(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <LinkIcon size={20} style={{ marginRight: '8px' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Add Document Link</h3>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                Source Document
              </label>
              <select
                value={addLinkForm.source}
                onChange={(e) => setAddLinkForm({ ...addLinkForm, source: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select source...</option>
                {graph?.nodes.filter(n => n.exists).map(node => (
                  <option key={node.id} value={node.id}>{node.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                Target Document
              </label>
              <select
                value={addLinkForm.target}
                onChange={(e) => setAddLinkForm({ ...addLinkForm, target: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select target...</option>
                {graph?.nodes.filter(n => n.exists).map(node => (
                  <option key={node.id} value={node.id}>{node.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                Relationship Type (Optional)
              </label>
              <select
                value={addLinkForm.relationType}
                onChange={(e) => setAddLinkForm({ ...addLinkForm, relationType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">None</option>
                <option value="depends-on">Depends On</option>
                <option value="related-to">Related To</option>
                <option value="implements">Implements</option>
                <option value="references">References</option>
                <option value="extends">Extends</option>
                <option value="supersedes">Supersedes</option>
                <option value="parent-of">Parent Of</option>
                <option value="child-of">Child Of</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setAddLinkForm({ source: '', target: '', relationType: '' });
                  setShowAddLinkDialog(false);
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddLink}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#4a9eff',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphView;
