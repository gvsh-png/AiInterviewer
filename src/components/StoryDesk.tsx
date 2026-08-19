"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import CutscenePlayer from "@/components/CutscenePlayer";
import PersonaAvatar from "@/components/PersonaAvatar";
import { getInterviewer } from "@/lib/interviewers";
import {
  assignNextStoryContact,
  getContactsSnapshot,
  parseContactsSnapshot,
  readContacts,
  subscribeToContacts,
  unusedInterviewers,
} from "@/lib/contacts";
import {
  EMPTY_SNAPSHOT,
  activeContact,
  cacheShots,
  campaignRun,
  chapterToKind,
  completedContacts,
  currentRoundLabel,
  endingTitle,
  getCampaignSnapshot,
  parseCampaignSnapshot,
  readCampaign,
  recapFromChapter,
  reconcileCampaign,
  rememberCutscene,
  subscribeToCampaign,
  totalRounds,
  updateCampaign,
} from "@/lib/campaign";
import {
  assembleShots,
  cacheKey,
  ensureOpeningNight,
  type CutsceneContext,
  type CutsceneKind,
  type Shot,
} from "@/lib/cutscenes";
import { rollStoryRun, offerStoryKinds, runFromNight } from "@/lib/storySeed";
import { coverJobLine, coverRoleLine } from "@/lib/cover";
import {
  getDirective,
  sampleTemperature,
  temperatureLabel,
} from "@/lib/gameplay";
import { startNightScore } from "@/lib/nightScore";

type Props = {
  /** Full-bleed player on /story. Inbox only teases the pending scene. */
  playHere?: boolean;
};

export default function StoryDesk({ playHere = false }: Props) {
  const router = useRouter();
  const [remoteShots, setRemoteShots] = useState<Shot[] | null>(null);
  const [replay, setReplay] = useState<Shot[] | null>(null);
  const [watching, setWatching] = useState(playHere);
  const [fallbackRun] = useState(() => rollStoryRun());
  const freezeShots = useRef(false);

  const campaignRaw = useSyncExternalStore(
    subscribeToCampaign,
    getCampaignSnapshot,
    () => EMPTY_SNAPSHOT
  );
  const contactsRaw = useSyncExternalStore(
    subscribeToContacts,
    getContactsSnapshot,
    () => "[]"
  );
  const campaign = useMemo(
    () => parseCampaignSnapshot(campaignRaw),
    [campaignRaw]
  );
  const contacts = useMemo(
    () => parseContactsSnapshot(contactsRaw),
    [contactsRaw]
  );

  useLayoutEffect(() => {
    readCampaign();
    reconcileCampaign(readContacts());
  }, [contactsRaw, campaignRaw]);

  // Intentionally keyed on the rolled ids so shot-cache writes do not rebuild the run.
  const run = useMemo(
    () => campaignRun(campaign) ?? fallbackRun,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- campaign.shotCache changes often
    [
      campaign.seed,
      campaign.premiseId,
      campaign.nightId,
      campaign.throughlineId,
      fallbackRun,
    ]
  );
  const kind = chapterToKind(campaign.chapter);
  const done = completedContacts(contacts);
  const current = activeContact(contacts);
  const remaining = unusedInterviewers().length;
  const currentPerson = current
    ? getInterviewer(current.interviewerId)
    : null;
  const last = done[0] ?? null;
  const lastPerson = last ? getInterviewer(last.interviewerId) : null;
  const round = cutsceneRound(kind, done.length, Boolean(current), remaining);
  const picking =
    Boolean(campaign.seed) &&
    campaign.chapter === "intro" &&
    !campaign.kindChosen;
  const pending =
    Boolean(campaign.seed) &&
    !picking &&
    (playHere || watching) &&
    !campaign.cutsceneDone &&
    !replay;
  const person =
    kind === "arrive"
      ? currentPerson
      : kind === "aftermath"
        ? lastPerson
        : currentPerson;

  const hires = done.filter((item) => item.verdict?.decision === "hire").length;
  const obsessed = done.filter(
    (item) => item.verdict?.decision === "obsessed"
  ).length;
  const rejects = done.filter(
    (item) => item.verdict?.decision === "reject"
  ).length;
  const closeTitle = endingTitle(contacts);
  const personJob = current?.appliedJob || person?.job || "";

  const ctx = useMemo((): CutsceneContext => {
    return {
      run,
      kind,
      round,
      total: totalRounds(),
      person: person
        ? {
            name: person.name,
            title: person.title,
            company: person.company,
            job: personJob,
          }
        : null,
      lastVerdict: last?.verdict?.decision ?? null,
      lastName: lastPerson?.name ?? null,
      hires,
      obsessed,
      rejects,
      endingTitle: closeTitle,
    };
  }, [
    run,
    kind,
    round,
    person,
    personJob,
    last?.verdict?.decision,
    lastPerson?.name,
    hires,
    obsessed,
    rejects,
    closeTitle,
  ]);

  const sceneKey = `${campaign.chapter}-${current?.interviewerId ?? "none"}-${round}`;
  const [activeScene, setActiveScene] = useState(sceneKey);
  if (activeScene !== sceneKey) {
    setActiveScene(sceneKey);
    setRemoteShots(null);
  }

  const filedShots = useMemo(() => {
    const shots = remoteShots?.length
      ? remoteShots
      : campaign.shotCache[cacheKey(ctx)] ?? assembleShots(ctx);
    return ensureOpeningNight(kind, shots);
  }, [remoteShots, ctx, campaign.shotCache, kind]);

  useEffect(() => {
    freezeShots.current = false;
  }, [sceneKey]);

  useEffect(() => {
    if (!pending) return;
    const key = cacheKey(ctx);
    if (campaign.shotCache[key]?.length) return;

    const controller = new AbortController();
    fetch("/api/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: ctx.kind,
        seed: run.seed,
        premiseId: run.premise.id,
        nightId: run.night.id,
        throughlineId: run.throughline.id,
        round: ctx.round,
        total: ctx.total,
        person: ctx.person,
        lastVerdict: ctx.lastVerdict,
        lastName: ctx.lastName,
        hires: ctx.hires,
        obsessed: ctx.obsessed,
        rejects: ctx.rejects,
        endingTitle: ctx.endingTitle,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as { shots?: Shot[] };
        if (!res.ok || !data.shots?.length) return;
        if (freezeShots.current) return;
        setRemoteShots(data.shots);
        cacheShots(key, data.shots);
      })
      .catch(() => {
        /* local shots already on screen */
      });

    return () => controller.abort();
    // shotCache is read once; caching the result would retrigger and abort the request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, sceneKey, ctx, run]);

  const startScene = () => {
    readCampaign();
    reconcileCampaign(readContacts());
    setWatching(true);
  };

  const finishChapter = useCallback(() => {
    freezeShots.current = true;
    rememberCutscene(
      recapFromChapter(campaign.chapter, round, filedShots)
    );

    if (kind === "prologue") {
      assignNextStoryContact({ seed: run.seed });
      updateCampaign({ chapter: "arrive", cutsceneDone: false });
      return;
    }

    if (kind === "arrive" && current) {
      router.push(`/interview/${current.interviewerId}`);
      return;
    }

    if (kind === "aftermath") {
      const state = readCampaign();
      if (done.length >= 6 && !state.midpointSeen && remaining > 0) {
        updateCampaign({ chapter: "midpoint", cutsceneDone: false });
        return;
      }
      if (remaining > 0) {
        assignNextStoryContact({ seed: run.seed });
        updateCampaign({ chapter: "arrive", cutsceneDone: false });
        return;
      }
      updateCampaign({ chapter: "ending", cutsceneDone: false });
      return;
    }

    if (kind === "midpoint") {
      assignNextStoryContact({ seed: run.seed });
      updateCampaign({
        chapter: "arrive",
        cutsceneDone: false,
        midpointSeen: true,
      });
      return;
    }
  }, [
    campaign.chapter,
    current,
    done.length,
    kind,
    remaining,
    round,
    router,
    filedShots,
    run.seed,
  ]);

  const chooseKind = (nightId: string) => {
    const next = runFromNight(campaign.seed || run.seed, nightId);
    updateCampaign({
      seed: next.seed,
      premiseId: next.premise.id,
      nightId: next.night.id,
      throughlineId: next.throughline.id,
      kindChosen: true,
      chapter: "intro",
      cutsceneDone: false,
    });
    void startNightScore(next.night.mood);
    setWatching(true);
  };

  if (!campaign.seed) {
    return (
      <section className="story-desk">
        <p className="story-beat">The night is being filed…</p>
      </section>
    );
  }

  if (picking) {
    return (
      <StoryKindPicker
        seed={campaign.seed || run.seed}
        onPick={chooseKind}
      />
    );
  }

  if (replay) {
    return (
      <CutscenePlayer
        shots={replay}
        person={person}
        run={run}
        actionLabel="Back"
        onComplete={() => setReplay(null)}
      />
    );
  }

  if (pending) {
    return (
      <CutscenePlayer
        key={sceneKey}
        shots={filedShots}
        person={person}
        run={run}
        actionLabel={actionLabel(kind, remaining, done.length)}
        onAdvance={() => {
          freezeShots.current = true;
        }}
        onComplete={finishChapter}
      />
    );
  }

  return (
    <section className="story-desk">
      <div className="story-copy">
        <p className="app-kicker">Campaign</p>
        <h2>{currentRoundLabel(campaign, contacts)}</h2>
        {run ? (
          <p className="story-beat">
            {run.premise.title}. {run.night.title}. {run.throughline.title}.
          </p>
        ) : (
          <p className="story-beat">The night has not started.</p>
        )}
        <p className="story-beat">
          {temperatureLabel(
            sampleTemperature({
              hires: done.filter((item) => item.verdict?.decision === "hire")
                .length,
              rejects: done.filter((item) => item.verdict?.decision === "reject")
                .length,
              obsessed: done.filter(
                (item) => item.verdict?.decision === "obsessed"
              ).length,
              cleanPasses: done.filter((item) => item.hourScore?.passed).length,
              flagged: done.filter(
                (item) => item.hourScore && !item.hourScore.passed
              ).length,
              midpoint: campaign.midpointSeen,
            })
          )}
          {current
            ? `. ${
                getDirective(current.directiveId)?.title ||
                (current.callbackPending
                  ? "Second pass still open"
                  : coverJobLine(current.appliedJob))
              }`
            : ""}
        </p>

        {!campaign.cutsceneDone ? (
          <button
            type="button"
            className="start-chat-button"
            onPointerDown={startScene}
            onClick={startScene}
          >
            Play the next scene
          </button>
        ) : null}

        {campaign.chapter === "ending" && campaign.cutsceneDone ? (
          <p className="story-beat">
            {endingTitle(contacts)}. The chats remain if they want another hour.
          </p>
        ) : null}

        {campaign.recap.length > 0 ? (
          <ol className="story-recap">
            {campaign.recap.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{entry.title}</strong>
                  <span>{entry.shots[0]?.line}</span>
                </div>
                {entry.shots.length > 0 ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setReplay(entry.shots)}
                  >
                    Replay
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="story-beat">Scenes you play will file here as a recap.</p>
        )}

        {done.length > 0 ? (
          <ul className="story-letters">
            {done.map((item) => {
              const npc = getInterviewer(item.interviewerId);
              if (!npc || !item.verdict) return null;
              return (
                <li key={item.interviewerId}>
                  <PersonaAvatar interviewer={npc} size="sm" />
                  <div>
                    <strong>{npc.name}</strong>
                    <span>
                      {coverRoleLine(npc)} · {coverJobLine(item.appliedJob)} ·{" "}
                      {item.verdict.decision}
                      {item.hourScore
                        ? item.hourScore.passed
                          ? " · brief held"
                          : " · brief flagged"
                        : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function cutsceneRound(
  kind: CutsceneKind,
  doneCount: number,
  hasCurrent: boolean,
  remaining: number
) {
  if (kind === "prologue") return 1;
  if (kind === "midpoint") return 6;
  if (kind === "ending") return 12;
  if (kind === "aftermath") return Math.max(1, doneCount);
  return Math.min(
    12,
    doneCount + (hasCurrent || remaining > 0 ? 1 : 0) || 1
  );
}

function actionLabel(
  kind: CutsceneKind,
  remaining: number,
  doneCount: number
) {
  if (kind === "prologue") return "I am in";
  if (kind === "arrive") return "Open chat";
  if (kind === "midpoint") return "Continue";
  if (kind === "ending") return "File the night";
  if (doneCount >= 6 && remaining > 0) return "Continue";
  return remaining > 0 ? "Next interview" : "See the ending";
}

function StoryKindPicker({
  seed,
  onPick,
}: {
  seed: string;
  onPick: (nightId: string) => void;
}) {
  const kinds = offerStoryKinds(seed);
  return (
    <section className="story-kinds">
      <div className="story-kinds-copy">
        <p className="app-kicker">PROBE</p>
        <h2>Which night is this?</h2>
        <p>
          Three files came off the printer. You pick the night. The building
          picks who messages first.
        </p>
      </div>
      <div className="story-kind-grid">
        {kinds.map((night) => (
          <StoryKindCard
            key={night.id}
            nightId={night.id}
            title={night.title}
            kicker={night.kicker}
            hook={night.hook}
            onPick={onPick}
          />
        ))}
      </div>
    </section>
  );
}

function StoryKindCard({
  nightId,
  title,
  kicker,
  hook,
  onPick,
}: {
  nightId: string;
  title: string;
  kicker: string;
  hook: string;
  onPick: (nightId: string) => void;
}) {
  const [src, setSrc] = useState("/stills/night.jpg");
  useEffect(() => {
    let gone = false;
    fetch("/api/story-still", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        still: "night",
        nightId,
        kicker,
        line: hook,
      }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { src?: string };
        if (!gone && data.src) setSrc(data.src);
      })
      .catch(() => {
        /* baked night still */
      });
    return () => {
      gone = true;
    };
  }, [nightId, kicker, hook]);

  return (
    <button
      type="button"
      className="story-kind-card"
      onClick={() => onPick(nightId)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- generated story stills */}
      <img src={src} alt="" draggable={false} />
      <span className="app-kicker">{kicker}</span>
      <strong>{title}</strong>
      <span>{hook}</span>
    </button>
  );
}
