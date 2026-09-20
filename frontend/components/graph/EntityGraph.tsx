"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { EntityGraph as EntityGraphData, GraphNode } from "@/lib/types";

const WIDTH = 720;
const HEIGHT = 460;

const NODE_STYLE: Record<GraphNode["type"], { fill: string; r: number; label: string }> = {
  bidder: { fill: "rgb(var(--primary))", r: 20, label: "Bidder" },
  pan: { fill: "rgb(var(--accent-teal))", r: 13, label: "PAN" },
  gstin: { fill: "rgb(var(--accent-teal))", r: 13, label: "GSTIN" },
  cin: { fill: "rgb(var(--accent-teal))", r: 13, label: "CIN" },
  din: { fill: "rgb(var(--info))", r: 13, label: "DIN" },
  address: { fill: "rgb(var(--ink-500))", r: 12, label: "Address" },
  email: { fill: "rgb(var(--ink-500))", r: 11, label: "Email" },
  phone: { fill: "rgb(var(--ink-500))", r: 11, label: "Phone" },
  bank: { fill: "rgb(var(--secondary))", r: 13, label: "Bank" },
  ip: { fill: "rgb(var(--info))", r: 12, label: "IP" },
};

interface Pos {
  x: number;
  y: number;
}

/** Deterministic force-directed layout (no external graph dependency). */
function layout(graph: EntityGraphData): Record<string, Pos> {
  const nodes = graph.nodes;
  const n = nodes.length;
  const pos: Record<string, Pos> = {};
  // seed on a circle (deterministic)
  nodes.forEach((node, i) => {
    const a = (i / n) * Math.PI * 2;
    pos[node.id] = { x: Math.cos(a) * 150, y: Math.sin(a) * 150 };
  });
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const edges = graph.edges.filter((e) => idx.has(e.source) && idx.has(e.target));

  const iterations = 320;
  const k = 90; // ideal spring length
  for (let it = 0; it < iterations; it++) {
    const disp: Record<string, Pos> = {};
    for (const nd of nodes) disp[nd.id] = { x: 0, y: 0 };
    // repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = pos[a.id].x - pos[b.id].x;
        const dy = pos[a.id].y - pos[b.id].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (k * k) / dist;
        const ux = dx / dist;
        const uy = dy / dist;
        disp[a.id].x += ux * force;
        disp[a.id].y += uy * force;
        disp[b.id].x -= ux * force;
        disp[b.id].y -= uy * force;
      }
    }
    // attraction along edges
    for (const e of edges) {
      const dx = pos[e.source].x - pos[e.target].x;
      const dy = pos[e.source].y - pos[e.target].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist * dist) / k;
      const ux = dx / dist;
      const uy = dy / dist;
      disp[e.source].x -= ux * force;
      disp[e.source].y -= uy * force;
      disp[e.target].x += ux * force;
      disp[e.target].y += uy * force;
    }
    const temp = 1 - it / iterations;
    for (const nd of nodes) {
      const d = disp[nd.id];
      const len = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01;
      const limit = Math.min(len, 30 * temp);
      pos[nd.id].x += (d.x / len) * limit;
      pos[nd.id].y += (d.y / len) * limit;
      // gentle gravity to center
      pos[nd.id].x *= 0.99;
      pos[nd.id].y *= 0.99;
    }
  }
  // normalize into viewbox
  const xs = nodes.map((nd) => pos[nd.id].x);
  const ys = nodes.map((nd) => pos[nd.id].y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 48;
  const sx = (WIDTH - pad * 2) / (maxX - minX || 1);
  const sy = (HEIGHT - pad * 2) / (maxY - minY || 1);
  const s = Math.min(sx, sy);
  for (const nd of nodes) {
    pos[nd.id] = {
      x: pad + (pos[nd.id].x - minX) * s,
      y: pad + (pos[nd.id].y - minY) * s,
    };
  }
  return pos;
}

export function EntityGraph({ graph }: { graph: EntityGraphData }) {
  const pos = useMemo(() => layout(graph), [graph]);
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const isClustered = (id: string) => !!nodeById.get(id)?.cluster;

  const connectedToSelected = (nodeId: string) => {
    if (!selectedNode) return false;
    return graph.edges.some(
      (e) =>
        (e.source === selectedNode && e.target === nodeId) ||
        (e.target === selectedNode && e.source === nodeId),
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr,260px]">
        <div className="overflow-hidden rounded-input border border-border bg-surface-1">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label="Entity resolution graph of bidders and shared attributes"
          >
            {/* edges */}
            {graph.edges.map((e, i) => {
              const a = pos[e.source];
              const b = pos[e.target];
              if (!a || !b) return null;
              const clusterEdge = isClustered(e.source) && isClustered(e.target);
              const active = selectedEdge === i;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={clusterEdge ? "rgb(var(--danger))" : "rgb(var(--rag-track))"}
                  strokeWidth={active ? 3.5 : clusterEdge ? 2.2 : 1.4}
                  strokeOpacity={active ? 1 : clusterEdge ? 0.8 : 0.5}
                  strokeDasharray={clusterEdge ? undefined : "4 3"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedEdge(i);
                    setSelectedNode(null);
                  }}
                />
              );
            })}
            {/* nodes */}
            {graph.nodes.map((node) => {
              const p = pos[node.id];
              if (!p) return null;
              const style = NODE_STYLE[node.type];
              const clustered = !!node.cluster;
              const dim = selectedNode && node.id !== selectedNode && !connectedToSelected(node.id);
              return (
                <g
                  key={node.id}
                  transform={`translate(${p.x} ${p.y})`}
                  className="cursor-pointer"
                  opacity={dim ? 0.35 : 1}
                  onClick={() => {
                    setSelectedNode(node.id);
                    setSelectedEdge(null);
                  }}
                >
                  {clustered && (
                    <circle r={style.r + 5} fill="none" stroke="rgb(var(--danger))" strokeWidth={2} strokeDasharray="3 2" />
                  )}
                  <circle r={style.r} fill={style.fill} stroke="rgb(var(--white))" strokeWidth={2} />
                  <text
                    y={style.r + 12}
                    textAnchor="middle"
                    className="fill-ink-700 text-[9px] font-medium"
                    style={{ fontSize: 9 }}
                  >
                    {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* details + legend */}
        <div className="space-y-3">
          <div className="rounded-input border border-border bg-surface p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">Node types</p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5">
              {Array.from(new Set(graph.nodes.map((n) => n.type))).map((type) => (
                <li key={type} className="flex items-center gap-1.5 text-2xs text-ink-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_STYLE[type].fill }} />
                  {NODE_STYLE[type].label}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-input border border-border bg-surface p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">Details</p>
            {selectedEdge !== null && graph.edges[selectedEdge] ? (
              <div className="mt-2 text-sm">
                <p className="font-medium text-ink-900">
                  {nodeById.get(graph.edges[selectedEdge].source)?.label} →{" "}
                  {nodeById.get(graph.edges[selectedEdge].target)?.label}
                </p>
                <p className="mt-1 text-2xs text-ink-500">
                  Relation: <span className="font-medium text-ink-700">{graph.edges[selectedEdge].relation}</span> ·
                  weight {graph.edges[selectedEdge].weight}
                </p>
              </div>
            ) : selectedNode ? (
              <div className="mt-2 text-sm">
                <p className="font-medium text-ink-900">{nodeById.get(selectedNode)?.label}</p>
                <p className="mt-1 text-2xs text-ink-500">
                  {NODE_STYLE[nodeById.get(selectedNode)!.type].label}
                  {nodeById.get(selectedNode)?.cluster ? " · in flagged cluster" : ""}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-2xs text-ink-500">
                Click a node or edge to see why entities are linked.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* clusters */}
      {graph.clusters.length > 0 && (
        <div className="space-y-2">
          {graph.clusters.map((c) => (
            <div
              key={c.id}
              className={cn(
                "rounded-input border px-3 py-2.5",
                c.severity === "high"
                  ? "border-danger/30 bg-danger-bg"
                  : "border-warning/30 bg-warning-bg",
              )}
            >
              <p className="text-sm font-semibold text-ink-900">
                Flagged cluster ({c.severity} severity):{" "}
                {c.bidder_ids.map((id) => nodeById.get(id)?.label ?? id).join(" · ")}
              </p>
              <p className="mt-0.5 text-2xs text-ink-700">{c.reason}</p>
            </div>
          ))}
        </div>
      )}

      {/* accessible table fallback */}
      <details className="rounded-input border border-border bg-surface">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink-900">
          Accessible table (relationships)
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-xs">
            <thead className="bg-surface-1 text-left text-2xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Relation</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2 text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {graph.edges.map((e, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 text-ink-900">{nodeById.get(e.source)?.label ?? e.source}</td>
                  <td className="px-3 py-2 text-ink-700">{e.relation}</td>
                  <td className="px-3 py-2 text-ink-900">{nodeById.get(e.target)?.label ?? e.target}</td>
                  <td className="tnum px-3 py-2 text-right text-ink-700">{e.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
