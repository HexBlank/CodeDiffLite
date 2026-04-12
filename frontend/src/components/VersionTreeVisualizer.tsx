import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import { ZoomIn, ZoomOut, Maximize, GitCommit, GitCompare, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SnippetListItem, Snippet } from '@/lib/api'
import { formatDistanceToNow } from '@/lib/date'
import { toast } from 'sonner'

interface TreeNode {
  id: string
  data: Snippet | SnippetListItem
  children: TreeNode[]
  x?: number
  y?: number
}

interface VersionTreeVisualizerProps {
  root: Snippet
  descendants: SnippetListItem[]
  onNodeClick?: (id: string) => void
  currentId?: string
  onCompare?: (baseId: string, compareId: string) => void
}

export function VersionTreeVisualizer({
  root,
  descendants,
  onNodeClick,
  currentId,
  onCompare,
}: VersionTreeVisualizerProps) {
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<string | null>(currentId || root.id)
  
  // 多选对比模式
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])

  // 所有版本列表
  const allVersions = [
    { ...root, code_preview: root.code.substring(0, 100) },
    ...descendants,
  ]

  // 构建树形数据
  const buildTree = (): TreeNode => {
    const nodeMap = new Map<string, TreeNode>()
    
    // 创建根节点
    const rootNode: TreeNode = {
      id: root.id,
      data: root,
      children: [],
    }
    nodeMap.set(root.id, rootNode)
    
    // 创建所有节点
    descendants.forEach((desc) => {
      nodeMap.set(desc.id, {
        id: desc.id,
        data: desc,
        children: [],
      })
    })
    
    // 建立父子关系
    descendants.forEach((desc) => {
      const node = nodeMap.get(desc.id)!
      const parentId = desc.parent_id
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.children.push(node)
      } else {
        // 如果找不到父节点，挂到根节点
        rootNode.children.push(node)
      }
    })
    
    return rootNode
  }

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const treeData = buildTree()
    const container = containerRef.current
    const width = container.clientWidth
    const height = Math.max(400, container.clientHeight)
    const nodeRadius = 20

    // 清空 SVG
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // 创建渐变定义
    const defs = svg.append('defs')
    
    // 节点渐变
    const gradient = defs.append('linearGradient')
      .attr('id', 'nodeGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%')
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#6366f1')
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#8b5cf6')

    // 当前节点渐变
    const activeGradient = defs.append('linearGradient')
      .attr('id', 'activeNodeGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%')
    activeGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b')
    activeGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ef4444')

    const g = svg.append('g')

    // 缩放行为
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform.toString())
        setZoom(event.transform.k)
      })

    svg.call(zoomBehavior as any)

    // 使用 d3.tree 布局
    const rootHierarchy = d3.hierarchy<TreeNode>(treeData, (d: any) => d.children)
    
    // 计算树的大小
    // 改用 nodeSize 可以固定节点之间的相对距离，避免线过长，使得树更紧凑
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([80, 100])
      .separation((a: any, b: any) => (a.parent === b.parent ? 1 : 1.2))

    treeLayout(rootHierarchy)

    // 居中偏移
    const allNodes: any[] = rootHierarchy.descendants()
    const bounds = allNodes.reduce(
      (acc: any, d: any) => ({
        minX: Math.min(acc.minX, d.x),
        maxX: Math.max(acc.maxX, d.x),
        minY: Math.min(acc.minY, d.y),
        maxY: Math.max(acc.maxY, d.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    )

    const treeWidth = bounds.maxX - bounds.minX
    const treeHeight = bounds.maxY - bounds.minY
    const offsetX = (width - treeWidth) / 2 - bounds.minX
    const offsetY = 50

    // 绘制连接线
    const links = rootHierarchy.links()
    g.selectAll('path.link')
      .data(links as any)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        return d3.linkVertical()({
          source: [d.source.x + offsetX, d.source.y + offsetY],
          target: [d.target.x + offsetX, d.target.y + offsetY]
        } as any)
      })
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d: any) => {
        const sourceId = d.source.data.id
        const targetId = d.target.data.id
        return (sourceId === selectedNode || targetId === selectedNode) ? 'none' : '5,5'
      })
      .attr('stroke', (d: any) => {
        const sourceId = d.source.data.id
        const targetId = d.target.data.id
        return (sourceId === selectedNode || targetId === selectedNode) ? '#6366f1' : '#e5e7eb'
      })

    // 绘制节点组
    const nodes = g.selectAll('g.node')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x + offsetX},${d.y + offsetY})`)
      .style('cursor', 'pointer')
      .on('click', (_event: any, d: any) => {
        const nodeId = d.data.id
        setSelectedNode(nodeId)
        
        if (compareMode) {
          // 多选模式
          setSelectedForCompare(prev => {
            if (prev.includes(nodeId)) {
              return prev.filter(id => id !== nodeId)
            }
            if (prev.length >= 2) {
              return [prev[1], nodeId]
            }
            return [...prev, nodeId]
          })
        } else if (onNodeClick) {
          onNodeClick(nodeId)
        } else {
          navigate(`/${nodeId}`)
        }
      })

    // 节点圆圈
    nodes.append('circle')
      .attr('r', nodeRadius)
      .attr('fill', (d: any) => {
        const nodeId = d.data.id
        // 多选模式下的高亮
        if (compareMode && selectedForCompare.includes(nodeId)) {
          const index = selectedForCompare.indexOf(nodeId)
          return index === 0 ? '#f59e0b' : '#ef4444'  // 第一个选中的橙色，第二个红色
        }
        return nodeId === selectedNode ? 'url(#activeNodeGradient)' : 'url(#nodeGradient)'
      })
      .attr('stroke', (d: any) => {
        const nodeId = d.data.id
        // 多选模式下添加边框
        if (compareMode && selectedForCompare.includes(nodeId)) {
          return '#fff'
        }
        return '#fff'
      })
      .attr('stroke-width', (d: any) => {
        const nodeId = d.data.id
        if (compareMode && selectedForCompare.includes(nodeId)) {
          return 4
        }
        return 3
      })
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
      .transition()
      .duration(500)
      .attr('r', nodeRadius)

    // 节点图标
    nodes.append('text')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text((d: any) => {
        const data = d.data.data
        return (data.language || 'text').charAt(0).toUpperCase()
      })

    // 节点标签（版本号/深度）
    nodes.append('text')
      .attr('dy', nodeRadius + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '10px')
      .text((d: any) => `v${d.depth}`)

    // 初始缩放以适应视图
    const initialScale = Math.min(
      (width - 40) / (treeWidth + 100),
      (height - 40) / (treeHeight + 100),
      1
    )
    
    svg.call(
      zoomBehavior.transform as any,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(initialScale)
        .translate(-(bounds.minX + bounds.maxX) / 2 - offsetX, -bounds.minY - offsetY + 50)
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps -- D3 imperative rendering; navigate/onNodeClick/selectedNode are captured in D3 event handlers re-bindable on each render triggered by data changes
  }, [root, descendants, currentId, compareMode, selectedForCompare])

  const handleZoomIn = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(
      (d3.zoom() as any).transform,
      d3.zoomTransform(svgRef.current).scale(zoom * 1.2)
    )
  }

  const handleZoomOut = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(
      (d3.zoom() as any).transform,
      d3.zoomTransform(svgRef.current).scale(zoom * 0.8)
    )
  }

  const handleReset = () => {
    if (!svgRef.current || !containerRef.current) return
    const svg = d3.select(svgRef.current)
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    
    svg.transition().duration(500).call(
      (d3.zoom() as any).transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
    )
  }

  // 获取选中节点的数据
  const selectedNodeData = selectedNode === root.id 
    ? root 
    : descendants.find(d => d.id === selectedNode)

  return (
    <div className="relative rounded-lg border bg-white dark:bg-gray-900 overflow-hidden h-full flex flex-col">
      {/* 顶部提示栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 px-4 py-2 flex items-center justify-center text-sm text-indigo-700 dark:text-indigo-300">
        {compareMode ? (
          <span className="flex items-center gap-1.5"><GitCompare className="w-4 h-4" /> 选择任意两个节点开始对比</span>
        ) : (
          <span className="flex items-center gap-1.5"><GitCommit className="w-4 h-4" /> 点击节点查看版本详情，或点击左侧对比图标进入对比模式</span>
        )}
      </div>

      {/* 工具栏 */}
      <div className="absolute left-4 top-14 z-10 flex flex-col gap-2">
        <Button variant="secondary" size="icon" onClick={handleZoomIn} title="放大">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleZoomOut} title="缩小">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleReset} title="适应屏幕">
          <Maximize className="h-4 w-4" />
        </Button>
        <Button 
          variant={compareMode ? "default" : "secondary"} 
          size="icon" 
          className={compareMode ? "bg-indigo-600 hover:bg-indigo-700 shadow-md" : ""}
          onClick={() => {
            setCompareMode(!compareMode)
            setSelectedForCompare([])
          }}
          title={compareMode ? "退出对比模式" : "进入对比模式"}
        >
          <GitCompare className="h-4 w-4" />
        </Button>
      </div>

      {/* 缩放比例显示 */}
      <div className="absolute right-4 top-14 z-10 rounded-md bg-white/90 px-2 py-1 text-xs text-gray-500 shadow dark:bg-gray-800">
        {Math.round(zoom * 100)}%
      </div>

      {/* 选中节点信息 */}
      {!compareMode && selectedNodeData && (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-indigo-100 dark:border-indigo-900 bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-gray-800/95 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
              <GitCommit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-100">
                  {(selectedNodeData as any).language || 'text'}
                </Badge>
                <span className="text-sm font-medium truncate">
                  {(selectedNodeData as any).message || '无标题修改'}
                </span>
                {selectedNodeData.id === currentId && (
                  <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50 dark:border-green-900 dark:text-green-400 dark:bg-green-900/30">当前</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2">
                <span>{formatDistanceToNow(selectedNodeData.created_at)}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                <span className="font-mono">{selectedNodeData.id.substring(0, 8)}</span>
              </p>
            </div>
            <Button 
              size="sm" 
              className={selectedNodeData.id === currentId ? "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100" : ""}
              onClick={() => {
                if (selectedNodeData.id !== currentId) {
                  navigate(`/${selectedNodeData.id}`)
                }
              }}
            >
              {selectedNodeData.id === currentId ? "当前所在" : "查看此版本"}
            </Button>
          </div>
        </div>
      )}

      {/* 多选对比模式信息栏 */}
      {compareMode && (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-gray-800/95">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <div className={`flex items-center gap-2 flex-1 p-2 rounded-md border ${selectedForCompare[0] ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20' : 'border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50'} transition-colors`}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold shadow-sm">
                  1
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm truncate ${!selectedForCompare[0] && 'text-gray-400'}`}>
                    {selectedForCompare[0] 
                      ? (allVersions.find(v => v.id === selectedForCompare[0])?.message || '无标题修改')
                      : '点击节点选择基准版本'}
                  </span>
                  {selectedForCompare[0] && (
                    <span className="text-[10px] text-gray-500 font-mono">{selectedForCompare[0].substring(0, 8)}</span>
                  )}
                </div>
              </div>
              <GitCompare className="h-5 w-5 text-gray-400 shrink-0" />
              <div className={`flex items-center gap-2 flex-1 p-2 rounded-md border ${selectedForCompare[1] ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50'} transition-colors`}>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${selectedForCompare[0] ? 'bg-red-500 shadow-sm' : 'bg-gray-300 dark:bg-gray-700'} text-white text-xs font-bold transition-colors`}>
                  2
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm truncate ${!selectedForCompare[1] && 'text-gray-400'}`}>
                    {selectedForCompare[1] 
                      ? (allVersions.find(v => v.id === selectedForCompare[1])?.message || '无标题修改')
                      : '点击节点选择目标版本'}
                  </span>
                  {selectedForCompare[1] && (
                    <span className="text-[10px] text-gray-500 font-mono">{selectedForCompare[1].substring(0, 8)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedForCompare([])}
                disabled={selectedForCompare.length === 0}
              >
                重置选择
              </Button>
              <Button 
                size="sm"
                className={selectedForCompare.length === 2 ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                disabled={selectedForCompare.length !== 2}
                onClick={() => {
                  if (selectedForCompare.length === 2 && onCompare) {
                    onCompare(selectedForCompare[0], selectedForCompare[1])
                  } else if (selectedForCompare.length === 2) {
                    toast.info('请在代码页面使用版本对比功能')
                  }
                }}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                查看对比差异
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SVG 容器 */}
      <div ref={containerRef} className="flex-1 w-full min-h-[400px]">
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      </div>
    </div>
  )
}
