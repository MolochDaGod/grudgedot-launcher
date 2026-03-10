import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Plus, Users, Sword, Navigation, Sparkles, Target, TreePine, 
  Settings, Play, Save, Trash2, Copy, Eye, Crosshair, Shield,
  Heart, Zap, Move, Wind, Swords, Filter, ExternalLink
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { 
  OpenRTSUnit, OpenRTSWeapon, OpenRTSMover, OpenRTSEffect, 
  OpenRTSActor, OpenRTSProjectile, OpenRTSTrinket 
} from "@shared/schema";

type PathfindingMode = "Walk" | "Fly";
type Heightmap = "Ground" | "Sky" | "Air";
type StandingMode = "Stand" | "Prone";
type Race = "human" | "alien" | "undead" | "mechanical" | "nature";
type DamageType = "physical" | "magic" | "fire" | "ice" | "explosive" | "poison";

interface RtsModel {
  grudgeId: string;
  displayName: string;
  file: string;
  category: string;
  unitType: string;
  customizable?: boolean;
  sizeBytes: number;
  tags?: string[];
}

interface RtsRaceData {
  name: string;
  faction: string;
  emoji: string;
  color: string;
  models: RtsModel[];
}

interface RtsModelCatalog {
  baseUrl: string;
  totalModels: number;
  races: Record<string, RtsRaceData>;
  vehicles?: RtsModel[];
  stats?: {
    totalByRace?: Record<string, number>;
  };
}

const RACES: { value: Race; label: string; color: string }[] = [
  { value: "human", label: "Human", color: "bg-blue-500" },
  { value: "alien", label: "Alien", color: "bg-green-500" },
  { value: "undead", label: "Undead", color: "bg-purple-500" },
  { value: "mechanical", label: "Mechanical", color: "bg-gray-500" },
  { value: "nature", label: "Nature", color: "bg-emerald-500" },
];

const DAMAGE_TYPES: { value: DamageType; label: string; icon: typeof Sword }[] = [
  { value: "physical", label: "Physical", icon: Sword },
  { value: "magic", label: "Magic", icon: Sparkles },
  { value: "fire", label: "Fire", icon: Zap },
  { value: "ice", label: "Ice", icon: Wind },
  { value: "explosive", label: "Explosive", icon: Target },
  { value: "poison", label: "Poison", icon: Shield },
];

export default function RtsBuilder() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("units");
  const [selectedUnit, setSelectedUnit] = useState<OpenRTSUnit | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<OpenRTSWeapon | null>(null);
  const [isCreateUnitOpen, setIsCreateUnitOpen] = useState(false);
  const [isCreateWeaponOpen, setIsCreateWeaponOpen] = useState(false);

  const { data: units = [], isLoading: unitsLoading } = useQuery<OpenRTSUnit[]>({
    queryKey: ["/api/openrts/units"],
  });

  const { data: weapons = [], isLoading: weaponsLoading } = useQuery<OpenRTSWeapon[]>({
    queryKey: ["/api/openrts/weapons"],
  });

  const { data: movers = [], isLoading: moversLoading } = useQuery<OpenRTSMover[]>({
    queryKey: ["/api/openrts/movers"],
  });

  const { data: effects = [] } = useQuery<OpenRTSEffect[]>({
    queryKey: ["/api/openrts/effects"],
  });

  const createUnitMutation = useMutation({
    mutationFn: async (data: Partial<OpenRTSUnit>) => {
      const res = await apiRequest("POST", "/api/openrts/units", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrts/units"] });
      setIsCreateUnitOpen(false);
      toast({ title: "Unit Created", description: "New unit added to your army" });
    },
  });

  const createWeaponMutation = useMutation({
    mutationFn: async (data: Partial<OpenRTSWeapon>) => {
      const res = await apiRequest("POST", "/api/openrts/weapons", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrts/weapons"] });
      setIsCreateWeaponOpen(false);
      toast({ title: "Weapon Created", description: "New weapon added to arsenal" });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/openrts/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrts/units"] });
      setSelectedUnit(null);
      toast({ title: "Unit Deleted" });
    },
  });

  const deleteWeaponMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/openrts/weapons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrts/weapons"] });
      setSelectedWeapon(null);
      toast({ title: "Weapon Deleted" });
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              OpenRTS Builder
            </h1>
            <p className="text-sm text-muted-foreground">
              Create units, weapons, movers, and effects for your RTS game
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" data-testid="button-export-dsl">
              <Copy className="mr-2 h-4 w-4" />
              Export DSL
            </Button>
            <Button size="sm" data-testid="button-preview-game">
              <Play className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1">
          <div className="w-48 border-r bg-muted/30 p-2">
            <TabsList className="flex h-auto flex-col w-full gap-1 bg-transparent">
              <TabsTrigger 
                value="units" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-units"
              >
                <Users className="h-4 w-4" />
                Units ({units.length})
              </TabsTrigger>
              <TabsTrigger 
                value="weapons" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-weapons"
              >
                <Sword className="h-4 w-4" />
                Weapons ({weapons.length})
              </TabsTrigger>
              <TabsTrigger 
                value="movers" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-movers"
              >
                <Navigation className="h-4 w-4" />
                Movers ({movers.length})
              </TabsTrigger>
              <TabsTrigger 
                value="effects" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-effects"
              >
                <Sparkles className="h-4 w-4" />
                Effects ({effects.length})
              </TabsTrigger>
              <TabsTrigger 
                value="actors" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-actors"
              >
                <Swords className="h-4 w-4" />
                Actors (3D)
              </TabsTrigger>
              <TabsTrigger 
                value="trinkets" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-trinkets"
              >
                <TreePine className="h-4 w-4" />
                Trinkets
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="units" className="h-full m-0 p-0">
              <UnitsPanel 
                units={units} 
                weapons={weapons}
                movers={movers}
                selectedUnit={selectedUnit}
                setSelectedUnit={setSelectedUnit}
                isCreateOpen={isCreateUnitOpen}
                setIsCreateOpen={setIsCreateUnitOpen}
                createMutation={createUnitMutation}
                deleteMutation={deleteUnitMutation}
                isLoading={unitsLoading}
              />
            </TabsContent>

            <TabsContent value="weapons" className="h-full m-0 p-0">
              <WeaponsPanel
                weapons={weapons}
                effects={effects}
                selectedWeapon={selectedWeapon}
                setSelectedWeapon={setSelectedWeapon}
                isCreateOpen={isCreateWeaponOpen}
                setIsCreateOpen={setIsCreateWeaponOpen}
                createMutation={createWeaponMutation}
                deleteMutation={deleteWeaponMutation}
                isLoading={weaponsLoading}
              />
            </TabsContent>

            <TabsContent value="movers" className="h-full m-0 p-0">
              <MoversPanel movers={movers} isLoading={moversLoading} />
            </TabsContent>

            <TabsContent value="effects" className="h-full m-0 p-0">
              <EffectsPanel effects={effects} />
            </TabsContent>

            <TabsContent value="actors" className="h-full m-0 p-0">
              <ActorsPanel />
            </TabsContent>

            <TabsContent value="trinkets" className="h-full m-0 p-0">
              <TrinketsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function UnitsPanel({ 
  units, 
  weapons,
  movers,
  selectedUnit, 
  setSelectedUnit,
  isCreateOpen,
  setIsCreateOpen,
  createMutation,
  deleteMutation,
  isLoading
}: {
  units: OpenRTSUnit[];
  weapons: OpenRTSWeapon[];
  movers: OpenRTSMover[];
  selectedUnit: OpenRTSUnit | null;
  setSelectedUnit: (unit: OpenRTSUnit | null) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  createMutation: any;
  deleteMutation: any;
  isLoading: boolean;
}) {
  const [newUnit, setNewUnit] = useState({
    name: "",
    uiName: "",
    race: "human" as Race,
    radius: "0.25",
    separationRadius: "0.25",
    speed: "2.5",
    mass: "1.0",
    maxHealth: 100,
    sight: "7",
    moverLink: "Ground",
    weaponLinks: [] as string[],
    cost: { gold: 100 },
    buildTime: 15,
  });

  const handleCreateUnit = () => {
    createMutation.mutate(newUnit);
  };

  const groupedUnits = units.reduce((acc, unit) => {
    const race = unit.race || "human";
    if (!acc[race]) acc[race] = [];
    acc[race].push(unit);
    return acc;
  }, {} as Record<string, OpenRTSUnit[]>);

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Unit Library</h3>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-unit">
                <Plus className="mr-1 h-4 w-4" />
                New Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Unit</DialogTitle>
                <DialogDescription>Define a new combat unit with OpenRTS properties</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label>Unit ID</Label>
                    <Input 
                      value={newUnit.name}
                      onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                      placeholder="Marine"
                      data-testid="input-unit-id"
                    />
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input 
                      value={newUnit.uiName}
                      onChange={(e) => setNewUnit({ ...newUnit, uiName: e.target.value })}
                      placeholder="Space Marine"
                      data-testid="input-unit-name"
                    />
                  </div>
                  <div>
                    <Label>Race</Label>
                    <Select value={newUnit.race} onValueChange={(v: Race) => setNewUnit({ ...newUnit, race: v })}>
                      <SelectTrigger data-testid="select-race">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RACES.map(race => (
                          <SelectItem key={race.value} value={race.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${race.color}`} />
                              {race.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Mover Type</Label>
                    <Select value={newUnit.moverLink} onValueChange={(v) => setNewUnit({ ...newUnit, moverLink: v })}>
                      <SelectTrigger data-testid="select-mover">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {movers.map(mover => (
                          <SelectItem key={mover.name} value={mover.name}>
                            <div className="flex items-center gap-2">
                              {mover.pathfindingMode === "Fly" ? <Wind className="h-3 w-3" /> : <Move className="h-3 w-3" />}
                              {mover.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Max Health: {newUnit.maxHealth}</Label>
                    <Slider 
                      value={[newUnit.maxHealth]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, maxHealth: v })}
                      min={10} max={1000} step={10}
                    />
                  </div>
                  <div>
                    <Label>Speed: {newUnit.speed}</Label>
                    <Slider 
                      value={[parseFloat(newUnit.speed)]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, speed: v.toString() })}
                      min={0.5} max={15} step={0.5}
                    />
                  </div>
                  <div>
                    <Label>Sight Range: {newUnit.sight}</Label>
                    <Slider 
                      value={[parseFloat(newUnit.sight)]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, sight: v.toString() })}
                      min={1} max={20} step={1}
                    />
                  </div>
                  <div>
                    <Label>Collision Radius: {newUnit.radius}</Label>
                    <Slider 
                      value={[parseFloat(newUnit.radius)]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, radius: v.toString(), separationRadius: v.toString() })}
                      min={0.1} max={2} step={0.05}
                    />
                  </div>
                  <div>
                    <Label>Gold Cost: {newUnit.cost.gold}</Label>
                    <Slider 
                      value={[newUnit.cost.gold]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, cost: { gold: v } })}
                      min={0} max={1000} step={25}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleCreateUnit} 
                  disabled={!newUnit.name || !newUnit.uiName || createMutation.isPending}
                  data-testid="button-submit-unit"
                >
                  Create Unit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading units...</div>
          ) : (
            <div className="p-2 space-y-4">
              {Object.entries(groupedUnits).map(([race, raceUnits]) => (
                <div key={race}>
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className={`w-2 h-2 rounded-full ${RACES.find(r => r.value === race)?.color || 'bg-gray-400'}`} />
                    <span className="text-xs font-medium uppercase text-muted-foreground">{race}</span>
                    <Badge variant="secondary" className="text-xs">{raceUnits.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {raceUnits.map(unit => (
                      <div
                        key={unit.id}
                        className={`p-2 rounded-md cursor-pointer transition-colors ${
                          selectedUnit?.id === unit.id 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'hover-elevate'
                        }`}
                        onClick={() => setSelectedUnit(unit)}
                        data-testid={`unit-card-${unit.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{unit.uiName}</span>
                          <Badge variant="outline" className="text-xs">{unit.moverLink || 'Ground'}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {unit.maxHealth}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" /> {unit.speed}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {unit.sight}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {units.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No units yet</p>
                  <p className="text-xs">Create your first unit</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 p-4">
        {selectedUnit ? (
          <UnitDetails 
            unit={selectedUnit} 
            weapons={weapons}
            movers={movers}
            onDelete={() => deleteMutation.mutate(selectedUnit.id)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a unit to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UnitDetails({ 
  unit, 
  weapons, 
  movers,
  onDelete 
}: { 
  unit: OpenRTSUnit; 
  weapons: OpenRTSWeapon[];
  movers: OpenRTSMover[];
  onDelete: () => void;
}) {
  const race = RACES.find(r => r.value === unit.race);
  const mover = movers.find(m => m.name === unit.moverLink);
  const unitWeapons = weapons.filter(w => unit.weaponLinks?.includes(w.name));
  const cost = unit.cost as { gold?: number } | null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {unit.uiName}
            <Badge className={race?.color}>{race?.label}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground font-mono">ID: {unit.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Copy className="mr-1 h-4 w-4" />
            Duplicate
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} data-testid="button-delete-unit">
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Combat Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Health</span>
              <span className="font-medium">{unit.maxHealth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Speed</span>
              <span className="font-medium">{unit.speed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sight</span>
              <span className="font-medium">{unit.sight}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mass</span>
              <span className="font-medium">{unit.mass}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Move className="h-4 w-4 text-blue-500" />
              Movement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mover</span>
              <Badge variant="outline">{unit.moverLink || 'None'}</Badge>
            </div>
            {mover && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pathfinding</span>
                  <span className="font-medium">{mover.pathfindingMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heightmap</span>
                  <span className="font-medium">{mover.heightmap}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Radius</span>
              <span className="font-medium">{unit.radius}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-yellow-500" />
              Production
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gold Cost</span>
              <span className="font-medium">{cost?.gold ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Build Time</span>
              <span className="font-medium">{unit.buildTime}s</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sword className="h-4 w-4 text-orange-500" />
            Weapons ({unitWeapons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unitWeapons.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {unitWeapons.map(weapon => (
                <div key={weapon.id} className="p-2 rounded-md bg-muted">
                  <div className="font-medium">{weapon.uiName}</div>
                  <div className="text-xs text-muted-foreground">
                    Range: {weapon.range} | Damage: {weapon.damage} | Cooldown: {weapon.period}s
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No weapons assigned</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">OpenRTS DSL Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto">
{`Unit ${unit.name} {
    uIName "${unit.uiName}"
    race ${unit.race}
    radius ${unit.radius}
    separationRadius ${unit.separationRadius}
    speed ${unit.speed}
    mass ${unit.mass}
    maxHealth ${unit.maxHealth}
    sight ${unit.sight}
    mover ${unit.moverLink || 'Ground'}
    ${unit.weaponLinks?.length ? `weapons {
        ${unit.weaponLinks.map(w => `weapon ${w}`).join('\n        ')}
    }` : ''}
}`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function WeaponsPanel({
  weapons,
  effects,
  selectedWeapon,
  setSelectedWeapon,
  isCreateOpen,
  setIsCreateOpen,
  createMutation,
  deleteMutation,
  isLoading
}: {
  weapons: OpenRTSWeapon[];
  effects: OpenRTSEffect[];
  selectedWeapon: OpenRTSWeapon | null;
  setSelectedWeapon: (weapon: OpenRTSWeapon | null) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  createMutation: any;
  deleteMutation: any;
  isLoading: boolean;
}) {
  const [newWeapon, setNewWeapon] = useState({
    name: "",
    uiName: "",
    range: "5",
    scanRange: "7",
    period: "4",
    damage: 10,
    damageType: "physical" as DamageType,
    effectLink: "",
  });

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Weapon Arsenal</h3>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-weapon">
                <Plus className="mr-1 h-4 w-4" />
                New Weapon
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Weapon</DialogTitle>
                <DialogDescription>Define weapon stats and effects</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Weapon ID</Label>
                    <Input 
                      value={newWeapon.name}
                      onChange={(e) => setNewWeapon({ ...newWeapon, name: e.target.value })}
                      placeholder="LaserRifle"
                      data-testid="input-weapon-id"
                    />
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input 
                      value={newWeapon.uiName}
                      onChange={(e) => setNewWeapon({ ...newWeapon, uiName: e.target.value })}
                      placeholder="Laser Rifle"
                      data-testid="input-weapon-name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Damage Type</Label>
                  <Select value={newWeapon.damageType} onValueChange={(v: DamageType) => setNewWeapon({ ...newWeapon, damageType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAMAGE_TYPES.map(dt => (
                        <SelectItem key={dt.value} value={dt.value}>
                          <div className="flex items-center gap-2">
                            <dt.icon className="h-4 w-4" />
                            {dt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Damage: {newWeapon.damage}</Label>
                  <Slider 
                    value={[newWeapon.damage]} 
                    onValueChange={([v]) => setNewWeapon({ ...newWeapon, damage: v })}
                    min={1} max={200} step={1}
                  />
                </div>
                <div>
                  <Label>Attack Range: {newWeapon.range}</Label>
                  <Slider 
                    value={[parseFloat(newWeapon.range)]} 
                    onValueChange={([v]) => setNewWeapon({ ...newWeapon, range: v.toString() })}
                    min={0.1} max={20} step={0.5}
                  />
                </div>
                <div>
                  <Label>Cooldown: {newWeapon.period}s</Label>
                  <Slider 
                    value={[parseFloat(newWeapon.period)]} 
                    onValueChange={([v]) => setNewWeapon({ ...newWeapon, period: v.toString() })}
                    min={0.1} max={10} step={0.1}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createMutation.mutate(newWeapon)} 
                  disabled={!newWeapon.name || !newWeapon.uiName || createMutation.isPending}
                  data-testid="button-submit-weapon"
                >
                  Create Weapon
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {weapons.map(weapon => (
              <div
                key={weapon.id}
                className={`p-2 rounded-md cursor-pointer transition-colors ${
                  selectedWeapon?.id === weapon.id 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'hover-elevate'
                }`}
                onClick={() => setSelectedWeapon(weapon)}
                data-testid={`weapon-card-${weapon.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{weapon.uiName}</span>
                  <Badge variant="secondary" className="text-xs">{weapon.damageType}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>DMG: {weapon.damage}</span>
                  <span>Range: {weapon.range}</span>
                  <span>CD: {weapon.period}s</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 p-4">
        {selectedWeapon ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedWeapon.uiName}</h2>
                <p className="text-sm text-muted-foreground font-mono">ID: {selectedWeapon.name}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(selectedWeapon.id)}>
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Combat Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Damage</span>
                    <span className="font-medium text-red-500">{selectedWeapon.damage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Damage Type</span>
                    <Badge variant="outline">{selectedWeapon.damageType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attack Range</span>
                    <span className="font-medium">{selectedWeapon.range}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scan Range</span>
                    <span className="font-medium">{selectedWeapon.scanRange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cooldown</span>
                    <span className="font-medium">{selectedWeapon.period}s</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Effect Link</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedWeapon.effectLink ? (
                    <Badge>{selectedWeapon.effectLink}</Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">No effect linked</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">OpenRTS XML Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto">
{`<Weapon id="${selectedWeapon.name}">
    <UIName value="${selectedWeapon.uiName}"/>
    <EffectLink value="${selectedWeapon.effectLink || ''}"/>
    <Range value="${selectedWeapon.range}"/>
    <ScanRange value="${selectedWeapon.scanRange}"/>
    <Period value="${selectedWeapon.period}"/>
</Weapon>`}</pre>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Sword className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a weapon to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MoversPanel({ movers, isLoading }: { movers: OpenRTSMover[]; isLoading: boolean }) {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Movement Types</h3>
        <p className="text-sm text-muted-foreground">Pathfinding and heightmap configurations</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading movers...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {movers.map(mover => (
            <Card key={mover.id} data-testid={`mover-card-${mover.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {mover.pathfindingMode === "Fly" ? (
                    <Wind className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Navigation className="h-5 w-5 text-green-500" />
                  )}
                  {mover.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pathfinding</span>
                  <Badge variant="outline">{mover.pathfindingMode}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heightmap</span>
                  <Badge variant="secondary">{mover.heightmap}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Standing</span>
                  <span className="font-medium">{mover.standingMode}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">OpenRTS XML Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto max-h-48">
{movers.map(m => `<Mover id="${m.name}">
    <PathfindingMode value="${m.pathfindingMode}"/>
    <Heightmap value="${m.heightmap}"/>
    <StandingMode value="${m.standingMode}"/>
</Mover>`).join('\n')}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function EffectsPanel({ effects }: { effects: OpenRTSEffect[] }) {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Visual Effects</h3>
          <p className="text-sm text-muted-foreground">Damage effects, projectiles, and particles</p>
        </div>
        <Button size="sm" data-testid="button-create-effect">
          <Plus className="mr-1 h-4 w-4" />
          New Effect
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {effects.map(effect => (
          <Card key={effect.id} data-testid={`effect-card-${effect.id}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                {effect.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline">{effect.effectType}</Badge>
              </div>
              {effect.damage && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Damage</span>
                  <span className="font-medium text-red-500">{effect.damage}</span>
                </div>
              )}
              {effect.particleEffect && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Particle</span>
                  <span className="font-medium">{effect.particleEffect}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ActorsPanel() {
  const [raceFilter, setRaceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: rtsModelCatalog, isLoading } = useQuery<RtsModelCatalog>({
    queryKey: ["objectstore-rts-models"],
    queryFn: async () => {
      const res = await fetch("https://molochdagod.github.io/ObjectStore/api/v1/rtsModels.json");
      if (!res.ok) throw new Error("Failed to fetch RTS models");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Swords className="h-4 w-4" />
              3D Model Actors
            </h3>
            <p className="text-xs text-muted-foreground">
              {rtsModelCatalog?.totalModels ?? 0} GLB models from Grudge Warlords ObjectStore
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://molochdagod.github.io/ObjectStore/api/v1/rtsModels.json", "_blank")}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            API
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Input
            placeholder="Search models by name or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm"
            data-testid="input-search-actors"
          />
        </div>

        {/* Race Filter */}
        <div className="flex gap-1 flex-wrap mb-2">
          {["all", ...(rtsModelCatalog ? Object.keys(rtsModelCatalog.races) : [])].map((race) => {
            const raceData = race !== "all" ? rtsModelCatalog?.races[race] : null;
            const count = race === "all"
              ? (rtsModelCatalog?.totalModels ?? 0)
              : (rtsModelCatalog?.stats?.totalByRace?.[race] ?? 0);
            return (
              <Button
                key={race}
                variant={raceFilter === race ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setRaceFilter(race)}
                style={raceFilter === race && raceData?.color ? { backgroundColor: raceData.color } : {}}
                data-testid={`filter-race-${race}`}
              >
                {raceData?.emoji ?? "\ud83c\udf10"} {race.charAt(0).toUpperCase() + race.slice(1)} ({count})
              </Button>
            );
          })}
        </div>

        {/* Category Filter */}
        <div className="flex gap-1 flex-wrap">
          {["all", "character", "mount", "siege", "equipment", "vehicle"].map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setCategoryFilter(cat)}
              data-testid={`filter-actor-cat-${cat}`}
            >
              <Filter className="mr-1 h-3 w-3" />
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Loading 3D models from ObjectStore...</p>
          </div>
        ) : !rtsModelCatalog ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Swords className="mb-4 h-12 w-12 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Could not load models. Check ObjectStore API.</p>
          </div>
        ) : (
          <>
            {/* Race sections */}
            {Object.entries(rtsModelCatalog.races)
              .filter(([raceId]) => raceFilter === "all" || raceFilter === raceId)
              .map(([raceId, raceData]) => {
                const models = raceData.models.filter((m) => {
                  const matchesCat = categoryFilter === "all" || m.category === categoryFilter;
                  const matchesSearch = searchQuery === "" ||
                    m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
                  return matchesCat && matchesSearch;
                });
                if (models.length === 0) return null;
                return (
                  <div key={raceId} className="mb-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span>{raceData.emoji}</span>
                      <h4 className="text-sm font-semibold">{raceData.name}</h4>
                      <Badge style={{ backgroundColor: raceData.color, color: "#fff" }} className="text-xs">
                        {raceData.faction}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{models.length} models</span>
                    </div>
                    <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
                      {models.map((model) => (
                        <Card key={model.grudgeId} className="overflow-hidden hover-elevate" data-testid={`card-actor-${model.grudgeId}`}>
                          <div className="h-20 w-full bg-muted flex items-center justify-center">
                            <Swords className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <CardContent className="p-2">
                            <div className="font-medium text-xs line-clamp-1">{model.displayName}</div>
                            <p className="text-[10px] text-muted-foreground font-mono">{model.grudgeId}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-[10px] capitalize">{model.category}</Badge>
                              <Badge variant="secondary" className="text-[10px]">{model.unitType}</Badge>
                              {model.customizable && <Badge className="text-[10px] bg-emerald-600">Custom</Badge>}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-muted-foreground">{(model.sizeBytes / 1024).toFixed(0)} KB</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => window.open(`${rtsModelCatalog.baseUrl}/${model.file}`, "_blank")}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                GLB
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}

            {/* Vehicles section */}
            {(raceFilter === "all") && (categoryFilter === "all" || categoryFilter === "vehicle") && rtsModelCatalog.vehicles?.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <span>\ud83d\udea2</span>
                  <h4 className="text-sm font-semibold">Vehicles</h4>
                  <Badge variant="secondary" className="text-xs">{rtsModelCatalog.vehicles.length} models</Badge>
                </div>
                <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
                  {rtsModelCatalog.vehicles
                    .filter((m) => {
                      return searchQuery === "" ||
                        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
                    })
                    .map((model) => (
                    <Card key={model.grudgeId} className="overflow-hidden hover-elevate" data-testid={`card-actor-${model.grudgeId}`}>
                      <div className="h-20 w-full bg-muted flex items-center justify-center">
                        <Swords className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <CardContent className="p-2">
                        <div className="font-medium text-xs line-clamp-1">{model.displayName}</div>
                        <p className="text-[10px] text-muted-foreground font-mono">{model.grudgeId}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] capitalize">{model.category}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{model.unitType}</Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground">{(model.sizeBytes / 1024).toFixed(0)} KB</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => window.open(`${rtsModelCatalog.baseUrl}/${model.file}`, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            GLB
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}

function TrinketsPanel() {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Map Trinkets</h3>
          <p className="text-sm text-muted-foreground">Decorations and obstacles for the map</p>
        </div>
        <Button size="sm" data-testid="button-create-trinket">
          <Plus className="mr-1 h-4 w-4" />
          New Trinket
        </Button>
      </div>

      <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/30">
        <div className="text-center text-muted-foreground">
          <TreePine className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Trinket management coming soon</p>
          <p className="text-xs">Add trees, rocks, and decorations</p>
        </div>
      </div>
    </div>
  );
}
