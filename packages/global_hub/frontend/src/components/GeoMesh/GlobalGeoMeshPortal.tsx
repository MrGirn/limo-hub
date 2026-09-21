import React, { useState } from 'react';
import { Globe, Server, Activity, ShieldCheck, Zap, RefreshCw, Layers } from 'lucide-react';

interface MeshNode {
  node_id: string;
  region: string;
  city: string;
  endpoint: string;
  status: 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE';
  latency_ms: number;
  affiliates: number;
  active_trips: number;
}

const DEFAULT_MESH_NODES: MeshNode[] = [
  {
    node_id: 'hub-us-east-prod',
    region: 'US_EAST',
    city: 'New York (JFK / LGA / PHL)',
    endpoint: 'https://us-east.clearinghouse.limoglobal.com',
    status: 'HEALTHY',
    latency_ms: 12.4,
    affiliates: 320,
    active_trips: 84
  },
  {
    node_id: 'hub-us-west-prod',
    region: 'US_WEST',
    city: 'Los Angeles (LAX / SFO / LAS)',
    endpoint: 'https://us-west.clearinghouse.limoglobal.com',
    status: 'HEALTHY',
    latency_ms: 41.8,
    affiliates: 210,
    active_trips: 48
  },
  {
    node_id: 'hub-eu-west-prod',
    region: 'EU_WEST',
    city: 'London (LHR / LGW / EDI)',
    endpoint: 'https://eu-west.clearinghouse.limoglobal.com',
    status: 'HEALTHY',
    latency_ms: 76.2,
    affiliates: 190,
    active_trips: 39
  },
  {
    node_id: 'hub-eu-central-prod',
    region: 'EU_CENTRAL',
    city: 'Paris / Frankfurt (CDG / FRA / ZRH)',
    endpoint: 'https://eu-central.clearinghouse.limoglobal.com',
    status: 'HEALTHY',
    latency_ms: 84.5,
    affiliates: 240,
    active_trips: 61
  },
  {
    node_id: 'hub-me-central-prod',
    region: 'ME_CENTRAL',
    city: 'Dubai (DXB / DOH / RUH)',
    endpoint: 'https://me-central.clearinghouse.limoglobal.com',
    status: 'HEALTHY',
    latency_ms: 128.0,
    affiliates: 145,
    active_trips: 32
  },
  {
    node_id: 'hub-ap-southeast-prod',
    region: 'AP_SOUTHEAST',
    city: 'Singapore & Sydney (SIN / SYD)',
    endpoint: 'https://ap-southeast.clearinghouse.limoglobal.com',
    status: 'HEALTHY',
    latency_ms: 154.2,
    affiliates: 160,
    active_trips: 28
  }
];

export const GlobalGeoMeshPortal: React.FC = () => {
  const [nodes, setNodes] = useState<MeshNode[]>(DEFAULT_MESH_NODES);
  const [selectedNode, setSelectedNode] = useState<MeshNode>(DEFAULT_MESH_NODES[0]);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleTriggerGossip = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner (Light Mode) */}
      <div className="glass-card" style={{ padding: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #EFF6FF 100%)', border: '1px solid #E2E8F0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, border: '1px solid #BAE6FD' }}>
              Active-Active Geo Mesh
            </span>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Identical Global Hub Nodes</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>Worldwide Peer Federation & Gossip Cluster</h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            All Global Hub nodes run the identical codebase with auto-gossip heartbeat synchronization and regional authoritative routing.
          </p>
        </div>
        <button 
          onClick={handleTriggerGossip}
          className="btn-primary" 
          style={{ cursor: 'pointer', padding: '10px 18px', background: '#0078D4', boxShadow: '0 2px 8px rgba(0,120,212,0.3)' }}
        >
          <RefreshCw size={16} className={isSyncing ? 'pulse-live' : ''} />
          {isSyncing ? 'Broadcasting Gossip...' : 'Broadcast Gossip Mesh'}
        </button>
      </div>

      {/* Nodes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {nodes.map(node => (
          <div 
            key={node.node_id}
            onClick={() => setSelectedNode(node)}
            className="glass-card"
            style={{ 
              padding: '20px', 
              cursor: 'pointer',
              background: '#FFFFFF',
              border: selectedNode.node_id === node.node_id ? '2px solid #0078D4' : '1px solid #E2E8F0',
              boxShadow: selectedNode.node_id === node.node_id ? '0 4px 16px rgba(0,120,212,0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0078D4', letterSpacing: '0.05em' }}>{node.region}</div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>{node.city}</h3>
              </div>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: '700', 
                padding: '3px 8px', 
                borderRadius: '6px', 
                background: '#DCFCE7', 
                color: '#166534',
                border: '1px solid #86EFAC'
              }}>
                {node.status}
              </span>
            </div>

            <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', marginBottom: '14px', wordBreak: 'break-all' }}>
              {node.endpoint}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#F8FAFC', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>PING</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>{node.latency_ms}ms</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>AFFILIATES</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0078D4' }}>{node.affiliates}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>ACTIVE TRIPS</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#7C3AED' }}>{node.active_trips}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Node Details Inspection Blade */}
      <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={18} color="#0078D4" />
          Active Node Topology: {selectedNode.node_id} ({selectedNode.region})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Authoritative Region Scope</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>{selectedNode.region} (Metro Primary)</div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Stripe Connect Clearing Escrow</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#16A34A', marginTop: '4px' }}>80/10/10 Split Active</div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>AI Protocols Attached</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#7C3AED', marginTop: '4px' }}>ChatGPT Actions & MCP Tools</div>
          </div>
        </div>
      </div>
    </div>
  );
};
