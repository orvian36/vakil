"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { Search, Trash2, Sparkles } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Card,
  StatusPill,
  EmptyState,
  SectionHeader,
  KeyboardHint,
  Shimmer,
  ScanLine,
  Switch,
  Checkbox,
  RadioGroup,
  RadioItem,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  ToastProvider,
  useToast,
  ConfirmDialog,
} from "@/components/ui";

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex gap-2 flex-wrap">
      <Button onClick={() => toast({ title: "Info", description: "Heads up." })}>
        Info
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({ title: "Saved", description: "Case saved.", variant: "success" })
        }
      >
        Success
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast({ title: "AI thinking", description: "Drafting…", variant: "ai" })
        }
      >
        AI
      </Button>
      <Button
        variant="destructive"
        onClick={() =>
          toast({
            title: "Failed",
            description: "Could not delete.",
            variant: "error",
          })
        }
      >
        Error
      </Button>
    </div>
  );
}

export default function PrimitivesDemo() {
  if (process.env.NODE_ENV === "production") notFound();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [switchOn, setSwitchOn] = React.useState(false);
  const [check, setCheck] = React.useState<boolean | "indeterminate">(false);
  const [radio, setRadio] = React.useState("a");

  return (
    <ToastProvider>
      <TooltipProvider>
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
          <SectionHeader
            title="Editorial Court · Primitives"
            meta="Phase A demo · /dev/primitives"
            actions={<KeyboardHint keys={["⌘", "K"]} />}
          />

          {/* BUTTONS */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Buttons
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive" leftIcon={<Trash2 className="h-4 w-4" />}>
                Delete
              </Button>
              <Button variant="link">Read more</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </section>

          {/* INPUTS */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Inputs
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Input placeholder="Search cases…" leadingIcon={<Search className="h-4 w-4" />} />
              <Input placeholder="Email" />
              <Input placeholder="Required" error="This field is required" />
              <Textarea placeholder="Notes" />
            </div>
          </section>

          {/* SELECTORS + TOGGLES */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Selectors
            </h3>
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <Select>
                <SelectTrigger aria-label="evidence type">
                  <SelectValue placeholder="Pick evidence type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Medical records</SelectItem>
                  <SelectItem value="police">Police reports</SelectItem>
                  <SelectItem value="witness">Witness letters</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3">
                <Switch
                  checked={switchOn}
                  onCheckedChange={setSwitchOn}
                  aria-label="english/bengali"
                />
                <span className="text-sm text-ink-300">
                  {switchOn ? "বাংলা" : "English"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox checked={check} onCheckedChange={setCheck} aria-label="ok" />
                <span className="text-sm text-ink-300">I agree</span>
              </div>
              <RadioGroup value={radio} onValueChange={setRadio} className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-ink-300">
                  <RadioItem value="a" /> Option A
                </label>
                <label className="flex items-center gap-2 text-sm text-ink-300">
                  <RadioItem value="b" /> Option B
                </label>
              </RadioGroup>
            </div>
          </section>

          {/* CARDS + STATUS */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Cards & status
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <h4 className="font-display text-lg text-ink-100">Chrome card</h4>
                <p className="text-sm text-ink-400 mt-1">Default surface.</p>
              </Card>
              <Card variant="gold-accent">
                <h4 className="font-display text-lg text-ink-100">Gold-accent</h4>
                <p className="text-sm text-ink-400 mt-1">For AI / spotlight.</p>
              </Card>
              <Card variant="cream-paper">
                <h4 className="font-display text-lg">Cream paper</h4>
                <p className="text-sm mt-1">Documents only.</p>
              </Card>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="draft" />
              <StatusPill status="drafting" />
              <StatusPill status="drafted" />
              <StatusPill status="processing" />
              <StatusPill status="complete" />
              <StatusPill status="failed" />
              <StatusPill status="ai-suggested" />
            </div>
          </section>

          {/* TABS + TOOLTIP */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Tabs & tooltip
            </h3>
            <Tabs defaultValue="a">
              <TabsList>
                <TabsTrigger value="a">Writ</TabsTrigger>
                <TabsTrigger value="b">Statement of Claim</TabsTrigger>
                <TabsTrigger value="c">Witness</TabsTrigger>
              </TabsList>
              <TabsContent value="a">
                <Card variant="cream-paper">Writ content lives here.</Card>
              </TabsContent>
              <TabsContent value="b">
                <Card variant="cream-paper">SoC content.</Card>
              </TabsContent>
              <TabsContent value="c">
                <Card variant="cream-paper">Witness statement.</Card>
              </TabsContent>
            </Tabs>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>Some helper text.</TooltipContent>
            </Tooltip>
          </section>

          {/* DIALOG + DRAWER + CONFIRM */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Overlays
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>New case</DialogTitle>
                  <DialogDescription>
                    Set up a case in two quick steps.
                  </DialogDescription>
                  <DialogFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button>Continue ▸</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="secondary">Open drawer</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerTitle>Side sheet</DrawerTitle>
                  <p className="text-sm text-ink-400 mt-2">Slides in from the right.</p>
                </DrawerContent>
              </Drawer>

              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Delete case
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete this case?"
                description="This cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => new Promise((r) => setTimeout(r, 400))}
              />
            </div>
          </section>

          {/* TOASTS */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Toasts
            </h3>
            <ToastDemo />
          </section>

          {/* LOADING */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Loading
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <Shimmer className="h-5 w-3/4 mb-3" />
                <Shimmer className="h-4 w-full mb-2" />
                <Shimmer className="h-4 w-5/6" />
              </Card>
              <Card className="relative overflow-hidden h-32 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-gold-500" />
                <ScanLine />
              </Card>
            </div>
          </section>

          {/* EMPTY */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink-300 uppercase tracking-widest">
              Empty state
            </h3>
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="No cases yet"
              description="Create your first case to start drafting."
              action={<Button>+ New case</Button>}
            />
          </section>
        </div>
      </TooltipProvider>
    </ToastProvider>
  );
}
