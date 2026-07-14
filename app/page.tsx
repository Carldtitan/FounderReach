"use client";

import {
  ArrowRight,
  Bot,
  Check,
  ChevronLeft,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  History,
  Home,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Target as TargetIcon,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ApprovalMode,
  Draft,
  Goal,
  Market,
  MissionBundle,
  Stage,
  StepName,
  Target,
  Tone
} from "@/lib/types";

type Tab = "home" | "targets" | "drafts" | "approvals" | "history";
type SessionUser = { id: string; email?: string | null; name?: string | null };

const stages: Stage[] = ["Idea", "Beta", "First customers", "Growth"];
const goals: Goal[] = ["Interviews", "Beta users", "Customers", "Partners", "Investors"];
const markets: Market[] = ["Local", "US", "Global"];
const tones: Tone[] = ["Direct", "Warm", "Founder-led", "Enterprise"];
const approvals: ApprovalMode[] = ["Draft only", "Ask first"];
const onboardingLabels = ["Stage", "Goal", "Startup", "Audience", "Market", "Tone", "Approval"];
const runSteps: StepName[] = ["Research", "Score", "Draft", "Review"];

const focusByStage: Record<Stage, string[]> = {
  Idea: ["Pain", "Interviews", "Sources"],
  Beta: ["Early users", "Alternatives", "Feedback"],
  "First customers": ["Signals", "Buyers", "Sales drafts"],
  Growth: ["Partners", "Channels", "Offers"]
};

const navItems = [
  { id: "home" as Tab, label: "Home", icon: Home },
  { id: "targets" as Tab, label: "Targets", icon: TargetIcon },
  { id: "drafts" as Tab, label: "Drafts", icon: FileText },
  { id: "approvals" as Tab, label: "Approvals", icon: ShieldCheck },
  { id: "history" as Tab, label: "History", icon: History }
];

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function FounderReach() {
  const [session, setSession] = useState<"loading" | "anonymous" | "ready">("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mode, setMode] = useState<"start" | "onboarding" | "app">("start");
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const [bundle, setBundle] = useState<MissionBundle | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    stage: "Idea" as Stage,
    goal: "Interviews" as Goal,
    startup: "",
    audience: "",
    market: "US" as Market,
    region: "",
    tone: "Founder-led" as Tone,
    approvalMode: "Ask first" as ApprovalMode
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((body) => {
        if (body?.user?.id) {
          setUser(body.user as SessionUser);
          setSession("ready");
        } else {
          setSession("anonymous");
        }
      })
      .catch(() => setSession("anonymous"));
  }, []);

  const targets = bundle?.targets ?? [];
  const drafts = bundle?.drafts ?? [];
  const events = Array.isArray(bundle?.events) ? bundle.events : [];
  const approvedDrafts = drafts.filter((draft) => draft.status === "approved");
  const pendingDrafts = drafts.filter((draft) => draft.status === "draft" || draft.status === "edited");
  const contactableTargets = targets.filter((target) => Boolean(target.contact?.email || target.contact?.phone || target.contact?.contactUrl || target.contact?.website)).length;
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? null;
  const selectedTarget = selectedDraft ? targets.find((target) => target.id === selectedDraft.targetId) ?? null : null;
  const currentStepIndex = bundle ? runSteps.indexOf(bundle.mission.currentStep as StepName) : -1;

  const canContinue = useMemo(() => {
    if (step === 2) return form.startup.trim().length > 2;
    if (step === 3) return form.audience.trim().length > 2;
    return true;
  }, [form.audience, form.startup, step]);

  async function createMission() {
    if (!canContinue || busy) return;
    setBusy("mission");
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          description: form.startup
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Campaign setup failed");
      }
      const created = (await response.json()) as MissionBundle;
      setBundle(created);
      setMode("app");
      setTab("home");
      await runMission(created.mission.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign setup failed");
    } finally {
      setBusy(null);
    }
  }

  async function runMission(missionId = bundle?.mission.id) {
    if (!missionId || busy === "run") return;
    setBusy("run");
    setError(null);
    try {
      const response = await fetch(`/api/missions/${missionId}/run`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Run failed");
      }
      setBundle((await response.json()) as MissionBundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(null);
    }
  }

  async function decideDraft(draftId: string, decision: "approved" | "rejected") {
    if (!bundle) return;
    setBusy(`${decision}-${draftId}`);
    setError(null);
    try {
      const response = await fetch(`/api/missions/${bundle.mission.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, decision })
      });
      if (!response.ok) throw new Error("Approval failed");
      const body = await response.json();
      setBundle(body.bundle as MissionBundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft(draft: Draft) {
    if (!bundle) return;
    const edit = draftEdits[draft.id];
    if (!edit) {
      setEditingDraftId(null);
      return;
    }
    setBusy(`edit-${draft.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/missions/${bundle.mission.id}/drafts/${draft.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit)
      });
      if (!response.ok) throw new Error("Save failed");
      const body = await response.json();
      setBundle(body.bundle as MissionBundle);
      setEditingDraftId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  function startEditing(draft: Draft) {
    setEditingDraftId(draft.id);
    setDraftEdits((current) => ({
      ...current,
      [draft.id]: current[draft.id] || { subject: draft.subject, body: draft.body }
    }));
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => null);
    setUser(null);
    setBundle(null);
    setMode("start");
    setSession("anonymous");
  }

  if (session === "loading") {
    return (
      <main className="auth-screen">
        <span className="brand-mark"><Sparkles size={18} /></span>
      </main>
    );
  }

  if (session === "anonymous") {
    return <AuthGate onSignedIn={(nextUser) => { setUser(nextUser); setSession("ready"); }} />;
  }

  if (mode === "start") {
    return (
      <main className="start-screen">
        <div className="start-shell">
          <div className="brand-row">
            <span className="brand-mark">
              <Sparkles size={18} />
            </span>
            <span>FounderReach</span>
          </div>
          <section className="launch-panel">
            <div className="launch-copy">
              <p className="eyebrow">AI outreach employee</p>
              <h1>FounderReach</h1>
              <p className="tagline">Who to contact. What to say.</p>
              <div className="chip-row">
                <span>Targets</span>
                <span>Drafts</span>
                <span>Approval</span>
              </div>
            </div>
            <button className="primary-button jumbo" onClick={() => setMode("onboarding")}>
              Start <ArrowRight size={18} />
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (mode === "onboarding") {
    return (
      <main className="onboarding-screen">
        <section className="onboarding-card">
          <div className="onboarding-top">
            <button className="icon-button" onClick={() => (step === 0 ? setMode("start") : setStep(step - 1))}>
              <ChevronLeft size={18} />
            </button>
            <div className="dots" aria-label="Progress">
              {onboardingLabels.map((label, index) => (
                <span key={label} className={cx("dot", index === step && "active", index < step && "done")} />
              ))}
            </div>
          </div>
          <div className="question-block">
            <p className="eyebrow">{onboardingLabels[step]}</p>
            {renderQuestion()}
          </div>
          {error && <p className="inline-error">{error}</p>}
          <button
            className="primary-button full"
            disabled={!canContinue || busy === "mission"}
            onClick={() => (step === onboardingLabels.length - 1 ? createMission() : setStep(step + 1))}
          >
            {busy === "mission" ? <Loader2 className="spin" size={18} /> : null}
            {step === onboardingLabels.length - 1 ? "Build campaign" : "Next"}
          </button>
        </section>
      </main>
    );
  }

  if (!bundle) return null;

  return (
    <main className="app-frame">
      <aside className="side-rail">
        <div className="rail-brand">
          <Sparkles size={18} />
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={cx("rail-button", tab === item.id && "active")}
                onClick={() => setTab(item.id)}
                title={item.label}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">FounderReach</p>
            <h1>{bundle.founder.startup || "Campaign"}</h1>
          </div>
          <div className="top-actions">
            <button className="secondary-button" disabled={busy === "run"} onClick={() => runMission()}>
              {busy === "run" || bundle.mission.status === "running" ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
              Run
            </button>
            <button className="secondary-button" onClick={() => window.open("https://app.band.ai/dashboard", "_blank", "noopener,noreferrer")}>
              <MessageSquare size={17} />
              BAND
            </button>
            <span className="account-label" title={user?.email || "Signed in"}>{user?.email || user?.name || "Account"}</span>
            <button className="icon-button" onClick={signOut} title="Sign out" aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {error && (
          <div className="toast error">
            <X size={16} />
            {error}
          </div>
        )}

        <nav className="mobile-tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={cx(tab === item.id && "active")} onClick={() => setTab(item.id)} title={item.label}>
                <Icon size={18} />
              </button>
            );
          })}
        </nav>

        {tab === "home" && (
          <section className="dashboard-grid">
            <div className="mission-card span-2">
              <div>
                <div className="chip-row tight">
                  <span>{bundle.founder.stage}</span>
                  <span>{bundle.founder.goal}</span>
                  <span>{bundle.founder.market}</span>
                </div>
                <h2>{bundle.mission.playbook}</h2>
              </div>
              <div className="focus-row">
                {focusByStage[bundle.founder.stage].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            <Metric icon={TargetIcon} label="Targets" value={targets.length} />
            <Metric icon={Phone} label="Contact routes" value={contactableTargets} />
            <Metric icon={FileText} label="Drafts" value={drafts.length} />
            <Metric icon={ShieldCheck} label="Approved" value={approvedDrafts.length} />
            <RunTimeline
              status={bundle.mission.status}
              currentStepIndex={currentStepIndex}
              counts={{ Research: targets.length, Score: targets.length, Draft: drafts.length, Review: approvedDrafts.length }}
            />
            <AgentEvents events={events.slice(-5).reverse()} />
          </section>
        )}

        {tab === "targets" && (
          <section className="card-grid">
            {targets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                draft={drafts.find((draft) => draft.targetId === target.id)}
                busy={busy}
                onDraft={(draftId) => setSelectedDraftId(draftId)}
                onApprove={(draftId) => decideDraft(draftId, "approved")}
                onSkip={(draftId) => decideDraft(draftId, "rejected")}
              />
            ))}
            {!targets.length && <EmptyState icon={Search} label="No targets yet" action="Run" onAction={() => runMission()} />}
          </section>
        )}

        {tab === "drafts" && (
          <section className="draft-list">
            {drafts.map((draft) => {
              const target = targets.find((item) => item.id === draft.targetId);
              return (
                <button key={draft.id} className="draft-row" onClick={() => setSelectedDraftId(draft.id)}>
                  <span className={cx("status-dot", draft.status)} />
                  <span>
                    <strong>{draft.subject}</strong>
                    <small>{target?.company || draft.channel}</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              );
            })}
            {!drafts.length && <EmptyState icon={FileText} label="No drafts yet" action="Run" onAction={() => runMission()} />}
          </section>
        )}

        {tab === "approvals" && (
          <section className="approval-grid">
            <ApprovalColumn
              title="Pending"
              drafts={pendingDrafts}
              targets={targets}
              onOpen={setSelectedDraftId}
              onApprove={(id) => decideDraft(id, "approved")}
            />
            <ApprovalColumn title="Approved" drafts={approvedDrafts} targets={targets} onOpen={setSelectedDraftId} />
          </section>
        )}

        {tab === "history" && (
          <section className="history-card">
            <AgentEvents events={events.slice().reverse()} full />
          </section>
        )}
      </section>

      {selectedDraft && selectedTarget && (
        <DraftDrawer
          draft={selectedDraft}
          target={selectedTarget}
          editing={editingDraftId === selectedDraft.id}
          edit={draftEdits[selectedDraft.id] || { subject: selectedDraft.subject, body: selectedDraft.body }}
          busy={busy}
          onClose={() => {
            setSelectedDraftId(null);
            setEditingDraftId(null);
          }}
          onEdit={() => startEditing(selectedDraft)}
          onChange={(next) => setDraftEdits((current) => ({ ...current, [selectedDraft.id]: next }))}
          onSave={() => saveDraft(selectedDraft)}
          onApprove={() => decideDraft(selectedDraft.id, "approved")}
          onReject={() => decideDraft(selectedDraft.id, "rejected")}
        />
      )}
    </main>
  );

  function renderQuestion() {
    if (step === 0) {
      return <ChipGrid options={stages} value={form.stage} onPick={(stage) => setForm({ ...form, stage })} />;
    }
    if (step === 1) {
      return <ChipGrid options={goals} value={form.goal} onPick={(goal) => setForm({ ...form, goal })} />;
    }
    if (step === 2) {
      return (
        <label className="field">
          <span>What are you building?</span>
          <textarea
            value={form.startup}
            onChange={(event) => setForm({ ...form, startup: event.target.value })}
            placeholder="AI booking agent for local clinics"
            autoFocus
          />
        </label>
      );
    }
    if (step === 3) {
      return (
        <label className="field">
          <span>Who is it for?</span>
          <input
            value={form.audience}
            onChange={(event) => setForm({ ...form, audience: event.target.value })}
            placeholder="clinic owners, office managers"
            autoFocus
          />
        </label>
      );
    }
    if (step === 4) {
      return (
        <>
          <ChipGrid options={markets} value={form.market} onPick={(market) => setForm({ ...form, market })} />
          <label className="field compact">
            <span>Region</span>
            <input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} placeholder="Bay Area" />
          </label>
        </>
      );
    }
    if (step === 5) {
      return <ChipGrid options={tones} value={form.tone} onPick={(tone) => setForm({ ...form, tone })} />;
    }
    return <ChipGrid options={approvals} value={form.approvalMode} onPick={(approvalMode) => setForm({ ...form, approvalMode })} />;
  }
}

function AuthGate({ onSignedIn }: { onSignedIn: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!email || password.length < 8 || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(mode === "sign-in" ? "/api/auth/sign-in" : "/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Authentication failed");
      if (body.requireEmailVerification) {
        setMessage("Check your email, then sign in.");
        setMode("sign-in");
        return;
      }
      const session = await fetch("/api/auth/me").then((result) => result.json());
      if (!session?.user?.id) {
        setMessage("Account created. Sign in to continue.");
        setMode("sign-in");
        return;
      }
      onSignedIn(session.user as SessionUser);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand-row">
          <span className="brand-mark"><Sparkles size={18} /></span>
          <span>FounderReach</span>
        </div>
        <div className="auth-heading">
          <p className="eyebrow">{mode === "sign-in" ? "Welcome back" : "Create account"}</p>
          <h1>{mode === "sign-in" ? "Sign in" : "Get started"}</h1>
        </div>
        <div className="auth-fields">
          {mode === "sign-up" && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" autoComplete="name" />}
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" inputMode="email" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} type="password" />
        </div>
        {message && <p className="auth-message">{message}</p>}
        <button className="primary-button full" disabled={busy || !email || password.length < 8} onClick={submit}>
          {busy ? <Loader2 className="spin" size={17} /> : null}
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
        <button className="auth-switch" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>
          {mode === "sign-in" ? "Create account" : "Sign in"}
        </button>
      </section>
    </main>
  );
}

function ChipGrid<T extends string>({ options, value, onPick }: { options: T[]; value: T; onPick: (value: T) => void }) {
  return (
    <div className="option-grid">
      {options.map((option) => (
        <button key={option} className={cx("option-chip", value === option && "selected")} onClick={() => onPick(option)}>
          {option}
          {value === option && <Check size={16} />}
        </button>
      ))}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof TargetIcon; label: string; value: number }) {
  return (
    <div className="metric-card">
      <Icon size={19} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function RunTimeline({
  status,
  currentStepIndex,
  counts
}: {
  status: string;
  currentStepIndex: number;
  counts: Record<StepName, number>;
}) {
  return (
    <section className="timeline-panel span-2">
      <div className="section-head">
        <h2>Run</h2>
        <span className={cx("status-pill", status)}>{status}</span>
      </div>
      <div className="timeline">
        {runSteps.map((step, index) => {
          const done = status === "complete" || index < currentStepIndex;
          const active = status === "running" && index === currentStepIndex;
          return (
            <div key={step} className={cx("timeline-step", done && "done", active && "active")}>
              <span className="step-icon">
                {active ? <Loader2 className="spin" size={16} /> : done ? <Check size={16} /> : <Clock3 size={16} />}
              </span>
              <strong>{step}</strong>
              <small>{counts[step]}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AgentEvents({ events, full = false }: { events: MissionBundle["events"]; full?: boolean }) {
  const safeEvents = Array.isArray(events)
    ? events.filter((event): event is MissionBundle["events"][number] => Boolean(event && typeof event === "object"))
    : [];
  return (
    <section className={cx("events-panel", full && "full")}>
      <div className="section-head">
        <h2>{full ? "Campaign history" : "BAND control room"}</h2>
        <Bot size={18} />
      </div>
      <div className="event-list">
        {safeEvents.length ? (
          safeEvents.map((event) => (
            <div key={event.id} className="event-row">
              <span className="agent-dot" />
              <div>
                <strong>{event.agent || "Campaign coordinator"}</strong>
                <p>{event.message || "Campaign activity recorded"}</p>
              </div>
              <small>{event.tool || "FounderReach"}</small>
            </div>
          ))
        ) : (
          <p className="quiet">No events yet</p>
        )}
      </div>
    </section>
  );
}

function TargetCard({
  target,
  draft,
  busy,
  onDraft,
  onApprove,
  onSkip
}: {
  target: Target;
  draft?: Draft;
  busy: string | null;
  onDraft: (draftId: string) => void;
  onApprove: (draftId: string) => void;
  onSkip: (draftId: string) => void;
}) {
  const working = draft ? busy?.includes(draft.id) : false;
  const evidence = Array.isArray(target.evidence) ? target.evidence : [];
  return (
    <article className="target-card" data-testid="target-card">
      <div className="target-head">
        <div>
          <h2>{target.name}</h2>
          <p>{target.company}</p>
        </div>
        <span className={cx("score", target.score.toLowerCase())}>{target.score}</span>
      </div>
      <p className="reason">{target.rationale}</p>
      <div className="source-row">
        <a href={target.url} target="_blank" rel="noreferrer">
          {target.sourceDomain} <ExternalLink size={13} />
        </a>
        {evidence.slice(1, 3).map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
            {source.domain}
          </a>
        ))}
      </div>
      <ContactActions target={target} draft={draft} />
      <div className="card-actions">
        <button
          className="secondary-button"
          data-testid="target-draft-button"
          disabled={!draft}
          onClick={() => draft && onDraft(draft.id)}
        >
          Draft
        </button>
        <button className="secondary-button" disabled={!draft || working} onClick={() => draft && onSkip(draft.id)}>
          Skip
        </button>
        <button className="primary-button" disabled={!draft || working || draft?.status === "approved"} onClick={() => draft && onApprove(draft.id)}>
          {draft?.status === "approved" ? "Done" : "Approve"}
        </button>
      </div>
    </article>
  );
}

function DraftDrawer({
  draft,
  target,
  editing,
  edit,
  busy,
  onClose,
  onEdit,
  onChange,
  onSave,
  onApprove,
  onReject
}: {
  draft: Draft;
  target: Target;
  editing: boolean;
  edit: { subject: string; body: string };
  busy: string | null;
  onClose: () => void;
  onEdit: () => void;
  onChange: (value: { subject: string; body: string }) => void;
  onSave: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const evidence = Array.isArray(target.evidence) ? target.evidence : [];
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="draft-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <p className="eyebrow">{target.company}</p>
            <h2>{target.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {editing ? (
          <div className="edit-stack">
            <input value={edit.subject} onChange={(event) => onChange({ ...edit, subject: event.target.value })} />
            <textarea value={edit.body} onChange={(event) => onChange({ ...edit, body: event.target.value })} />
          </div>
        ) : (
          <div className="draft-copy">
            <h3>{draft.subject}</h3>
            <p>{draft.body}</p>
          </div>
        )}

        <div className="evidence-list">
          {evidence.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
              <span>{source.domain}</span>
              <ExternalLink size={14} />
            </a>
          ))}
        </div>

        <ContactActions target={target} draft={draft} />

        <div className="drawer-actions">
          {editing ? (
            <button className="secondary-button" disabled={busy === `edit-${draft.id}`} onClick={onSave}>
              Save
            </button>
          ) : (
            <button className="secondary-button" onClick={onEdit}>
              Edit
            </button>
          )}
          <button className="secondary-button" disabled={busy?.includes(draft.id)} onClick={onReject}>
            Reject
          </button>
          <button className="primary-button" disabled={busy?.includes(draft.id) || draft.status === "approved"} onClick={onApprove}>
            {draft.status === "approved" ? "Approved" : "Approve"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function ContactActions({ target, draft }: { target: Target; draft?: Draft }) {
  const contact = target.contact;
  if (!contact?.phone && !contact?.email && !contact?.contactUrl && !contact?.website) return null;
  const emailHref = contact.email && draft
    ? `mailto:${contact.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    : undefined;
  const webHref = contact.contactUrl || contact.website;
  return (
    <div className="contact-row" aria-label="Public contact routes">
      {contact.phone && (
        <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} title={`Call ${contact.phone}`}>
          <Phone size={14} />
          Call
        </a>
      )}
      {emailHref && (
        <a href={emailHref} title={`Open email to ${contact.email}`}>
          <Mail size={14} />
          Email
        </a>
      )}
      {webHref && (
        <a href={webHref} target="_blank" rel="noreferrer" title="Open public contact page">
          <Globe2 size={14} />
          Site
        </a>
      )}
    </div>
  );
}

function ApprovalColumn({
  title,
  drafts,
  targets,
  onOpen,
  onApprove
}: {
  title: string;
  drafts: Draft[];
  targets: Target[];
  onOpen: (id: string) => void;
  onApprove?: (id: string) => void;
}) {
  return (
    <section className="approval-column">
      <div className="section-head">
        <h2>{title}</h2>
        <span>{drafts.length}</span>
      </div>
      {drafts.map((draft) => {
        const target = targets.find((item) => item.id === draft.targetId);
        return (
          <div key={draft.id} className="approval-row">
            <button onClick={() => onOpen(draft.id)}>
              <strong>{target?.company || draft.subject}</strong>
              <small>{draft.subject}</small>
            </button>
            {onApprove && (
              <button className="icon-button dark" onClick={() => onApprove(draft.id)}>
                <Check size={17} />
              </button>
            )}
          </div>
        );
      })}
      {!drafts.length && <p className="quiet">Clear</p>}
    </section>
  );
}

function EmptyState({
  icon: Icon,
  label,
  action,
  onAction
}: {
  icon: typeof Search;
  label: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <section className="empty-state">
      <Icon size={24} />
      <h2>{label}</h2>
      <button className="primary-button" onClick={onAction}>
        {action}
      </button>
    </section>
  );
}
