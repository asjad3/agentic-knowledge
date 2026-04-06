"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Play, ToggleLeft, ToggleRight } from "lucide-react";
import type { Rule, RuleCondition, RuleAction } from "@/types";

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then((data) => setRules(data.rules ?? []))
      .catch(console.error);
  }, []);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Organizational Rules</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No rules yet.</p>
          <p className="text-sm text-muted-foreground">
            Create rules to automatically organize your notes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} onUpdate={() => {}} />
          ))}
        </div>
      )}

      {showForm && <RuleForm onClose={() => setShowForm(false)} onCreated={() => {
        setShowForm(false);
        window.location.reload();
      }} />}
    </div>
  );
}

function RuleCard({ rule, onUpdate }: { rule: Rule; onUpdate: () => void }) {
  const toggleEnabled = async () => {
    await fetch("/api/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
    });
    onUpdate();
  };

  const deleteRule = async () => {
    if (!confirm("Delete this rule?")) return;
    await fetch("/api/rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id }),
    });
    onUpdate();
  };

  const condStr = (c: RuleCondition) => {
    if (c.operator === "always") return "Always";
    const v = Array.isArray(c.value) ? c.value.join(", ") : c.value;
    return `${c.field} ${c.operator} "${v}"`;
  };

  const actStr = (a: RuleAction) => `${a.type} → ${a.target}`;

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">{rule.name}</h3>
            <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
              {rule.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {rule.description || "No description"}
          </p>
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">When:</span> {condStr(rule.condition)}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Then:</span> {actStr(rule.action)}
          </div>
          <span className="text-xs text-muted-foreground">
            Priority: {rule.priority}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleEnabled} className="text-muted-foreground hover:text-foreground">
            {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={deleteRule} className="text-muted-foreground hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RuleForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [field, setField] = useState<RuleCondition["field"]>("title");
  const [operator, setOperator] = useState<RuleCondition["operator"]>("contains");
  const [value, setValue] = useState("");
  const [actionType, setActionType] = useState<RuleAction["type"]>("move");
  const [actionTarget, setActionTarget] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !actionTarget.trim()) return;

    const condition: RuleCondition = { field, operator, value };
    const action: RuleAction = { type: actionType, target: actionTarget };

    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description, condition, action, enabled: true, priority: 0 }),
    });
    if (res.ok) onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background rounded-lg p-6 w-[500px] shadow-xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Create Rule</h2>
        <div className="space-y-3">
          <Input placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-2">
            <select className="flex-1 border rounded-md px-3 py-2 text-sm bg-background" value={field} onChange={(e) => setField(e.target.value as RuleCondition["field"])}>
              <option value="title">Title</option>
              <option value="tags">Tags</option>
              <option value="category">Category</option>
              <option value="source">Source</option>
              <option value="content">Content</option>
              <option value="path">Path</option>
            </select>
            <select className="flex-1 border rounded-md px-3 py-2 text-sm bg-background" value={operator} onChange={(e) => setOperator(e.target.value as RuleCondition["operator"])}>
              <option value="contains">Contains</option>
              <option value="equals">Equals</option>
              <option value="starts_with">Starts With</option>
              <option value="matches">Matches (regex)</option>
              <option value="has_tag">Has Tag</option>
              <option value="always">Always (true)</option>
            </select>
          </div>
          {operator !== "always" && (
            <Input placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} />
          )}
          <div className="flex gap-2">
            <select className="flex-1 border rounded-md px-3 py-2 text-sm bg-background" value={actionType} onChange={(e) => setActionType(e.target.value as RuleAction["type"])}>
              <option value="move">Move to folder</option>
              <option value="tag">Add tag</option>
              <option value="categorize">Set category</option>
            </select>
            <Input placeholder="Target (folder name / tag name)" value={actionTarget} onChange={(e) => setActionTarget(e.target.value)} className="flex-1" />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create</Button>
        </div>
      </div>
    </div>
  );
}
