import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Save, Trash2, Eye, Edit, Download, Upload, TreeDeciduous, Sparkles, Sword, Shield, Zap, ChevronDown, ChevronRight } from "lucide-react";
import type { SkillTree as SkillTreeType } from "@shared/schema";

interface SkillNode {
  id: string;
  title: string;
  tooltip: {
    content: string;
  };
  icon?: string;
  children: SkillNode[];
}

const defaultSkillData: SkillNode[] = [
  {
    id: "skill-1",
    title: "Basic Attack",
    tooltip: { content: "Learn the fundamentals of combat" },
    children: [
      {
        id: "skill-2",
        title: "Power Strike",
        tooltip: { content: "A powerful melee attack dealing 150% damage" },
        children: [
          {
            id: "skill-3",
            title: "Crushing Blow",
            tooltip: { content: "Critical strike that stuns enemies" },
            children: []
          }
        ]
      },
      {
        id: "skill-4",
        title: "Quick Slash",
        tooltip: { content: "Fast attack with reduced cooldown" },
        children: [
          {
            id: "skill-5",
            title: "Blade Storm",
            tooltip: { content: "Multiple rapid strikes in succession" },
            children: []
          }
        ]
      }
    ]
  }
];

const skillTemplates = {
  warrior: [
    {
      id: "warrior-1",
      title: "Warrior's Resolve",
      tooltip: { content: "Increase base health by 10%" },
      children: [
        {
          id: "warrior-2",
          title: "Iron Skin",
          tooltip: { content: "Reduce physical damage taken by 5%" },
          children: [
            {
              id: "warrior-3",
              title: "Unbreakable",
              tooltip: { content: "Become immune to stagger effects" },
              children: []
            }
          ]
        },
        {
          id: "warrior-4",
          title: "Battle Cry",
          tooltip: { content: "Inspire nearby allies, increasing damage" },
          children: []
        }
      ]
    }
  ],
  mage: [
    {
      id: "mage-1",
      title: "Arcane Knowledge",
      tooltip: { content: "Increase mana pool by 15%" },
      children: [
        {
          id: "mage-2",
          title: "Fireball",
          tooltip: { content: "Launch a fiery projectile at enemies" },
          children: [
            {
              id: "mage-3",
              title: "Meteor Strike",
              tooltip: { content: "Call down meteors from the sky" },
              children: []
            }
          ]
        },
        {
          id: "mage-4",
          title: "Frost Nova",
          tooltip: { content: "Freeze nearby enemies in place" },
          children: []
        }
      ]
    }
  ],
  ranger: [
    {
      id: "ranger-1",
      title: "Keen Eye",
      tooltip: { content: "Increase ranged accuracy by 15%" },
      children: [
        {
          id: "ranger-2",
          title: "Precision Shot",
          tooltip: { content: "Deal 200% damage with a aimed shot" },
          children: [
            {
              id: "ranger-3",
              title: "Volley",
              tooltip: { content: "Fire a burst of arrows at multiple targets" },
              children: []
            }
          ]
        },
        {
          id: "ranger-4",
          title: "Trap Mastery",
          tooltip: { content: "Place traps that slow and damage enemies" },
          children: []
        }
      ]
    }
  ]
};

function SkillNodeComponent({ 
  node, 
  unlockedSkills, 
  onToggle, 
  isUnlockable,
  depth = 0 
}: { 
  node: SkillNode; 
  unlockedSkills: Set<string>; 
  onToggle: (id: string) => void;
  isUnlockable: boolean;
  depth?: number;
}) {
  const isUnlocked = unlockedSkills.has(node.id);
  const canUnlock = isUnlockable && !isUnlocked;
  
  return (
    <div className="flex flex-col items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onToggle(node.id)}
            className={`
              w-16 h-16 rounded-full border-2 flex items-center justify-center
              transition-all duration-200 cursor-pointer
              ${isUnlocked 
                ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30' 
                : canUnlock 
                  ? 'bg-muted border-muted-foreground/50 hover:border-primary hover:bg-muted/80' 
                  : 'bg-muted/50 border-muted-foreground/30 opacity-50 cursor-not-allowed'
              }
            `}
            disabled={!isUnlocked && !canUnlock}
            data-testid={`skill-node-${node.id}`}
          >
            <Shield className={`h-6 w-6 ${isUnlocked ? '' : 'opacity-60'}`} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="font-semibold">{node.title}</div>
          <div className="text-sm text-muted-foreground">{node.tooltip.content}</div>
          {isUnlocked && <Badge variant="secondary" className="mt-1">Unlocked</Badge>}
        </TooltipContent>
      </Tooltip>
      
      <div className="mt-1 text-xs text-center max-w-20 truncate font-medium">
        {node.title}
      </div>
      
      {node.children.length > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="flex gap-8">
            {node.children.map((child, index) => (
              <div key={child.id} className="flex flex-col items-center">
                {node.children.length > 1 && (
                  <div className="relative w-full h-4">
                    <div className={`absolute top-0 h-px bg-border ${
                      index === 0 ? 'left-1/2 right-0' : 
                      index === node.children.length - 1 ? 'left-0 right-1/2' : 
                      'left-0 right-0'
                    }`} />
                    <div className="absolute left-1/2 top-0 w-px h-4 bg-border" />
                  </div>
                )}
                <SkillNodeComponent
                  node={child}
                  unlockedSkills={unlockedSkills}
                  onToggle={onToggle}
                  isUnlockable={isUnlocked}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SkillTreeVisual({ 
  data, 
  title,
  unlockedSkills,
  onToggleSkill
}: { 
  data: SkillNode[]; 
  title: string;
  unlockedSkills: Set<string>;
  onToggleSkill: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center p-8">
      <h3 className="text-xl font-bold mb-6" data-testid="text-tree-title">{title}</h3>
      <div className="flex gap-12">
        {data.map((rootNode) => (
          <SkillNodeComponent
            key={rootNode.id}
            node={rootNode}
            unlockedSkills={unlockedSkills}
            onToggle={onToggleSkill}
            isUnlockable={true}
          />
        ))}
      </div>
    </div>
  );
}

export default function SkillTreeEditor() {
  const { toast } = useToast();
  const [selectedTree, setSelectedTree] = useState<SkillTreeType | null>(null);
  const [treeData, setTreeData] = useState<SkillNode[]>(defaultSkillData);
  const [treeName, setTreeName] = useState("New Skill Tree");
  const [treeDescription, setTreeDescription] = useState("");
  const [treeCategory, setTreeCategory] = useState("general");
  const [unlockedSkills, setUnlockedSkills] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<SkillNode | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: skillTrees = [], isLoading } = useQuery<SkillTreeType[]>({
    queryKey: ["/api/skill-trees"]
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; category: string; treeData: SkillNode[] }) => {
      return apiRequest("POST", "/api/skill-trees", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-trees"] });
      toast({ title: "Skill tree created successfully" });
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create skill tree", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SkillTreeType> }) => {
      return apiRequest("PATCH", `/api/skill-trees/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-trees"] });
      toast({ title: "Skill tree saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save skill tree", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/skill-trees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-trees"] });
      setSelectedTree(null);
      setTreeData(defaultSkillData);
      toast({ title: "Skill tree deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete skill tree", variant: "destructive" });
    }
  });

  const loadTree = (tree: SkillTreeType) => {
    setSelectedTree(tree);
    setTreeName(tree.name);
    setTreeDescription(tree.description || "");
    setTreeCategory(tree.category);
    setTreeData(tree.treeData as SkillNode[] || defaultSkillData);
    const saved = tree.savedState as { unlockedSkills?: string[] } || {};
    setUnlockedSkills(new Set(saved.unlockedSkills || []));
  };

  const saveCurrentTree = () => {
    if (selectedTree) {
      updateMutation.mutate({
        id: selectedTree.id,
        data: {
          name: treeName,
          description: treeDescription,
          category: treeCategory,
          treeData: treeData,
          savedState: { unlockedSkills: Array.from(unlockedSkills) }
        }
      });
    }
  };

  const createNewTree = () => {
    createMutation.mutate({
      name: treeName,
      description: treeDescription,
      category: treeCategory,
      treeData: treeData
    });
  };

  const applyTemplate = (templateKey: keyof typeof skillTemplates) => {
    setTreeData(skillTemplates[templateKey]);
    setTreeName(`${templateKey.charAt(0).toUpperCase() + templateKey.slice(1)} Skill Tree`);
    setUnlockedSkills(new Set());
    toast({ title: `Applied ${templateKey} template` });
  };

  const toggleSkill = (skillId: string) => {
    setUnlockedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const addNodeToTree = (parentId: string | null, newNode: SkillNode) => {
    if (!parentId) {
      setTreeData([...treeData, newNode]);
      return;
    }

    const addToChildren = (nodes: SkillNode[]): SkillNode[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return { ...node, children: [...node.children, newNode] };
        }
        if (node.children.length > 0) {
          return { ...node, children: addToChildren(node.children) };
        }
        return node;
      });
    };

    setTreeData(addToChildren(treeData));
  };

  const updateNodeInTree = (nodeId: string, updates: Partial<SkillNode>) => {
    const updateNode = (nodes: SkillNode[]): SkillNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, ...updates };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    setTreeData(updateNode(treeData));
  };

  const removeNodeFromTree = (nodeId: string) => {
    const removeNode = (nodes: SkillNode[]): SkillNode[] => {
      return nodes.filter(node => {
        if (node.id === nodeId) return false;
        if (node.children.length > 0) {
          node.children = removeNode(node.children);
        }
        return true;
      });
    };

    setTreeData(removeNode(treeData));
  };

  const exportTree = () => {
    const exportData = {
      name: treeName,
      description: treeDescription,
      category: treeCategory,
      treeData: treeData,
      savedState: { unlockedSkills: Array.from(unlockedSkills) }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${treeName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTree = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.treeData) {
          setTreeName(data.name || "Imported Tree");
          setTreeDescription(data.description || "");
          setTreeCategory(data.category || "general");
          setTreeData(data.treeData);
          const saved = data.savedState as { unlockedSkills?: string[] } || {};
          setUnlockedSkills(new Set(saved.unlockedSkills || []));
          toast({ title: "Skill tree imported successfully" });
        }
      } catch {
        toast({ title: "Failed to import skill tree", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const flattenNodes = (nodes: SkillNode[], depth = 0): { node: SkillNode; depth: number }[] => {
    const result: { node: SkillNode; depth: number }[] = [];
    for (const node of nodes) {
      result.push({ node, depth });
      if (node.children.length > 0 && expandedNodes.has(node.id)) {
        result.push(...flattenNodes(node.children, depth + 1));
      }
    }
    return result;
  };

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleSaveNode = () => {
    if (!editingNode) return;
    
    if (parentNodeId) {
      addNodeToTree(parentNodeId, editingNode);
    } else {
      const existingNode = flattenNodes(treeData).find(({ node }) => node.id === editingNode.id);
      if (existingNode) {
        updateNodeInTree(editingNode.id, editingNode);
      } else {
        addNodeToTree(null, editingNode);
      }
    }
    setIsNodeDialogOpen(false);
    setEditingNode(null);
    setParentNodeId(null);
  };

  return (
    <div className="flex h-full">
      <div className="w-72 border-r bg-sidebar flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2" data-testid="text-skill-trees-title">
            <TreeDeciduous className="h-5 w-5" />
            Skill Trees
          </h2>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : skillTrees.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No skill trees yet</div>
            ) : (
              skillTrees.map((tree) => (
                <Button
                  key={tree.id}
                  variant={selectedTree?.id === tree.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => loadTree(tree)}
                  data-testid={`button-tree-${tree.id}`}
                >
                  <TreeDeciduous className="h-4 w-4 mr-2" />
                  {tree.name}
                </Button>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" data-testid="button-new-tree">
                <Plus className="h-4 w-4 mr-2" />
                New Skill Tree
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Skill Tree</DialogTitle>
                <DialogDescription>Configure your new skill tree settings and optionally start from a template.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tree-name">Name</Label>
                  <Input
                    id="tree-name"
                    value={treeName}
                    onChange={(e) => setTreeName(e.target.value)}
                    placeholder="Enter skill tree name"
                    data-testid="input-tree-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tree-desc">Description</Label>
                  <Textarea
                    id="tree-desc"
                    value={treeDescription}
                    onChange={(e) => setTreeDescription(e.target.value)}
                    placeholder="Describe this skill tree"
                    data-testid="input-tree-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tree-category">Category</Label>
                  <Select value={treeCategory} onValueChange={setTreeCategory}>
                    <SelectTrigger data-testid="select-tree-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="combat">Combat</SelectItem>
                      <SelectItem value="magic">Magic</SelectItem>
                      <SelectItem value="crafting">Crafting</SelectItem>
                      <SelectItem value="survival">Survival</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start from template</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => applyTemplate("warrior")} data-testid="button-template-warrior">
                      <Sword className="h-4 w-4 mr-1" /> Warrior
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => applyTemplate("mage")} data-testid="button-template-mage">
                      <Sparkles className="h-4 w-4 mr-1" /> Mage
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => applyTemplate("ranger")} data-testid="button-template-ranger">
                      <Zap className="h-4 w-4 mr-1" /> Ranger
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={createNewTree} disabled={createMutation.isPending} data-testid="button-create-tree">
                  Create Tree
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Input
              value={treeName}
              onChange={(e) => setTreeName(e.target.value)}
              className="w-64"
              placeholder="Skill tree name"
              data-testid="input-current-tree-name"
            />
            <Select value={treeCategory} onValueChange={setTreeCategory}>
              <SelectTrigger className="w-40" data-testid="select-current-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="combat">Combat</SelectItem>
                <SelectItem value="magic">Magic</SelectItem>
                <SelectItem value="crafting">Crafting</SelectItem>
                <SelectItem value="survival">Survival</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportTree} data-testid="button-export">
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" /> Import
                </span>
              </Button>
              <input type="file" accept=".json" onChange={importTree} className="hidden" data-testid="input-import" />
            </label>
            {selectedTree && (
              <>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(selectedTree.id)} data-testid="button-delete-tree">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button size="sm" onClick={saveCurrentTree} disabled={updateMutation.isPending} data-testid="button-save-tree">
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <Tabs defaultValue="visual" className="flex-1 flex flex-col">
            <div className="px-4 pt-2">
              <TabsList>
                <TabsTrigger value="visual" data-testid="tab-visual">
                  <Eye className="h-4 w-4 mr-1" /> Visual Preview
                </TabsTrigger>
                <TabsTrigger value="nodes" data-testid="tab-nodes">
                  <Edit className="h-4 w-4 mr-1" /> Edit Nodes
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="visual" className="flex-1 overflow-auto p-4">
              <Card className="h-full">
                <CardContent className="p-6 flex items-center justify-center min-h-[500px] overflow-auto">
                  <SkillTreeVisual 
                    data={treeData} 
                    title={treeName}
                    unlockedSkills={unlockedSkills}
                    onToggleSkill={toggleSkill}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nodes" className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      Skill Nodes
                      <Button
                        size="sm"
                        onClick={() => {
                          setParentNodeId(null);
                          setEditingNode({
                            id: `skill-${Date.now()}`,
                            title: "New Skill",
                            tooltip: { content: "Skill description" },
                            children: []
                          });
                          setIsNodeDialogOpen(true);
                        }}
                        data-testid="button-add-root-node"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Root
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1">
                        {flattenNodes(treeData).map(({ node, depth }) => (
                          <div
                            key={node.id}
                            className="flex items-center gap-2 p-2 rounded-md hover-elevate"
                            style={{ marginLeft: depth * 16 }}
                            data-testid={`node-${node.id}`}
                          >
                            {node.children.length > 0 ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={() => toggleExpand(node.id)}
                              >
                                {expandedNodes.has(node.id) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </Button>
                            ) : (
                              <div className="w-5" />
                            )}
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{node.title}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setParentNodeId(node.id);
                                setEditingNode({
                                  id: `skill-${Date.now()}`,
                                  title: "New Skill",
                                  tooltip: { content: "Skill description" },
                                  children: []
                                });
                                setIsNodeDialogOpen(true);
                              }}
                              data-testid={`button-add-child-${node.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingNode({ ...node });
                                setParentNodeId(null);
                                setIsNodeDialogOpen(true);
                              }}
                              data-testid={`button-edit-${node.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeNodeFromTree(node.id)}
                              data-testid={`button-delete-${node.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tree Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={treeDescription}
                        onChange={(e) => setTreeDescription(e.target.value)}
                        placeholder="Describe this skill tree"
                        data-testid="input-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Skills:</span>
                        <span className="ml-2 font-medium" data-testid="text-total-skills">
                          {flattenNodes(treeData, 0).length + 
                            treeData.reduce((acc, node) => acc + countAllChildren(node), 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Unlocked:</span>
                        <span className="ml-2 font-medium" data-testid="text-unlocked-skills">
                          {unlockedSkills.size}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{parentNodeId ? "Add Child Skill" : "Edit Skill"}</DialogTitle>
            <DialogDescription>Configure the skill node properties.</DialogDescription>
          </DialogHeader>
          {editingNode && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="node-title">Skill Name</Label>
                <Input
                  id="node-title"
                  value={editingNode.title}
                  onChange={(e) => setEditingNode({ ...editingNode, title: e.target.value })}
                  placeholder="Enter skill name"
                  data-testid="input-node-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="node-tooltip">Description</Label>
                <Textarea
                  id="node-tooltip"
                  value={editingNode.tooltip.content}
                  onChange={(e) => setEditingNode({ 
                    ...editingNode, 
                    tooltip: { content: e.target.value } 
                  })}
                  placeholder="Describe what this skill does"
                  data-testid="input-node-tooltip"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNodeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNode} data-testid="button-save-node">
              Save Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function countAllChildren(node: SkillNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countAllChildren(child);
  }
  return count;
}
