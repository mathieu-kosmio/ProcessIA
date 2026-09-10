import { useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  applyNodeChanges,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Model, Task } from '../../contracts/model.ts';

type TaskNode = Node<{ task: Task; proposalTarget: boolean }, 'task'>;
function TaskCard({ data, selected }: NodeProps<TaskNode>) {
  return (
    <div
      className={`task-card ${selected ? 'selected' : ''} ${data.proposalTarget ? 'proposal-target' : ''}`}
      data-proposal-target={data.proposalTarget ? 'true' : undefined}
    >
      {Object.entries({
        left: Position.Left,
        right: Position.Right,
        top: Position.Top,
        bottom: Position.Bottom,
      }).flatMap(([name, position]) => [
        <Handle
          key={`s-${name}`}
          id={`s-${name}`}
          type="source"
          position={position}
          isConnectable={false}
        />,
        <Handle
          key={`t-${name}`}
          id={`t-${name}`}
          type="target"
          position={position}
          isConnectable={false}
        />,
      ])}
      <div className="task-kind">
        <span className="task-symbol">▤</span> TÂCHE <span className="proposed-dot" />
      </div>
      <strong>{data.task.label}</strong>
      <div className="task-bottom">
        <span>{data.task.role ?? 'Rôle à préciser'}</span>
        <span>Proposé</span>
      </div>
    </div>
  );
}
const nodeTypes = { task: TaskCard };
export function Canvas({
  model,
  selected,
  proposalTarget,
  onSelect,
  busy,
  onMove,
}: {
  model: Model;
  selected?: string;
  proposalTarget?: string;
  onSelect: (id: string) => void;
  busy: boolean;
  onMove: (id: string, position: Task['position'], baseRevision: number) => Promise<boolean>;
}) {
  const [nodes, setNodes] = useState<TaskNode[]>([]);
  const dragRevision = useRef(model.revision);
  useEffect(() => {
    setNodes(
      model.tasks.map((task) => ({
        id: task.id,
        type: 'task',
        position: task.position,
        data: { task, proposalTarget: task.id === proposalTarget },
        selected: task.id === selected,
        ariaLabel: task.label,
      })),
    );
  }, [model, selected, proposalTarget]);
  const edges = model.links.map((link) => {
    const source = model.tasks.find((task) => task.id === link.source)!;
    const target = model.tasks.find((task) => task.id === link.target)!;
    const vertical =
      Math.abs(source.position.y - target.position.y) >
      Math.abs(source.position.x - target.position.x);
    const forward = vertical
      ? target.position.y > source.position.y
      : target.position.x > source.position.x;
    return {
      id: link.id,
      source: link.source,
      target: link.target,
      type: 'smoothstep',
      sourceHandle: `s-${vertical ? (forward ? 'bottom' : 'top') : forward ? 'right' : 'left'}`,
      targetHandle: `t-${vertical ? (forward ? 'top' : 'bottom') : forward ? 'left' : 'right'}`,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8ca69e', width: 18, height: 18 },
      style: { stroke: '#8ca69e', strokeWidth: 1.6 },
    };
  });
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={(changes) => setNodes((current) => applyNodeChanges(changes, current))}
      onNodeDragStart={() => {
        dragRevision.current = model.revision;
      }}
      onNodeDragStop={async (_, node) => {
        const original = model.tasks.find((task) => task.id === node.id)!;
        if (original.position.x === node.position.x && original.position.y === node.position.y)
          return;
        if (!(await onMove(node.id, node.position, dragRevision.current))) {
          setNodes((current) =>
            current.map((item) => ({
              ...item,
              position: model.tasks.find((task) => task.id === item.id)!.position,
            })),
          );
        }
      }}
      onNodeClick={(_, node) => onSelect(node.id)}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
      minZoom={0.3}
      maxZoom={1.5}
      nodesDraggable={!busy}
      nodesConnectable={false}
      edgesFocusable={false}
      deleteKeyCode={null}
      disableKeyboardA11y
      ariaLabelConfig={{
        'controls.zoomIn.ariaLabel': 'Agrandir la carte',
        'controls.zoomOut.ariaLabel': 'Réduire la carte',
        'controls.fitView.ariaLabel': 'Cadrer la carte',
      }}
    >
      <Background color="#cbd7d0" gap={22} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
