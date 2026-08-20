"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import ContactsSidebar from "@/components/ContactsSidebar";
import MessengerNav from "@/components/MessengerNav";
import NightNote from "@/components/NightNote";
import PersonaAvatar from "@/components/PersonaAvatar";
import {
  EMPTY_SNAPSHOT,
  activeContact,
  campaignEnded,
  campaignRun,
  completedContacts,
  getCampaignSnapshot,
  parseCampaignSnapshot,
  readCampaign,
  subscribeToCampaign,
  totalRounds,
} from "@/lib/campaign";
import { tonightMemo } from "@/lib/storySeed";
import {
  getContactsSnapshot,
  parseContactsSnapshot,
  subscribeToContacts,
  type AssignedContact,
} from "@/lib/contacts";
import {
  EMPTY_FILE_SNAPSHOT,
  getFileSnapshot,
  getNote,
  parseFileSnapshot,
  requestBadge,
  signHour,
  subscribeToFile,
  unlockedMemos,
  unlockedSampleMemos,
} from "@/lib/fileCabinet";
import { getInterviewer } from "@/lib/interviewers";
import { coverJobLine, coverRoleLine } from "@/lib/cover";
import { downloadVerdictPdf } from "@/lib/offerPdf";
import { verdictLabel } from "@/lib/verdict";
import {
  getDirective,
  sampleTemperature,
  temperatureLabel,
} from "@/lib/gameplay";
import { deskClick, getFunState, grantAward, playFun, subscribeToFunState } from "@/lib/funKit";

export default function FileScreen() {
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
  const fileRaw = useSyncExternalStore(
    subscribeToFile,
    getFileSnapshot,
    () => EMPTY_FILE_SNAPSHOT
  );

  const campaign = useMemo(
    () => parseCampaignSnapshot(campaignRaw),
    [campaignRaw]
  );
  const contacts = useMemo(
    () => parseContactsSnapshot(contactsRaw),
    [contactsRaw]
  );
  const file = useMemo(() => parseFileSnapshot(fileRaw), [fileRaw]);
  const toys = useSyncExternalStore(
    subscribeToFunState,
    getFunState,
    getFunState
  );

  useEffect(() => {
    readCampaign();
    playFun("file-drawer");
  }, []);

  const done = completedContacts(contacts);
  const current = activeContact(contacts);
  const hires = done.filter((item) => item.verdict?.decision === "hire").length;
  const rejects = done.filter((item) => item.verdict?.decision === "reject").length;
  const obsessed = done.filter(
    (item) => item.verdict?.decision === "obsessed"
  ).length;
  const cleanPasses = done.filter((item) => item.hourScore?.passed).length;
  const flagged = done.filter(
    (item) => item.hourScore && !item.hourScore.passed
  ).length;
  const probePasses = done.filter(
    (item) => item.hourScore?.passed && item.hourScore.kind === "probe"
  ).length;
  const letters = done.filter((item) => item.verdict);
  const run = campaignRun(campaign);
  const temp = sampleTemperature({
    hires,
    rejects,
    obsessed,
    cleanPasses,
    flagged,
    midpoint: campaign.midpointSeen,
  });
  const memos = [
    ...(run ? [tonightMemo(run)] : []),
    ...unlockedMemos(done.length),
    ...unlockedSampleMemos({
      cleanPasses,
      obsessed,
      probePasses,
      hires,
      rejects,
    }),
  ];
  const ended = campaignEnded(contacts) || campaign.chapter === "ending";
  const canRequestBadge =
    (hires >= 3 || cleanPasses >= 3) && !file.badgeRequested;
  const hours = Array.from({ length: totalRounds() }, (_, index) => {
    const contact = hourContact(contacts, index);
    return { index, contact };
  });

  const download = (contact: AssignedContact) => {
    const person = getInterviewer(contact.interviewerId);
    if (!person || !contact.verdict) return;
    downloadVerdictPdf({
      interviewer: person,
      appliedJob: contact.appliedJob,
      verdict: contact.verdict,
    });
  };

  return (
    <main className="messenger-shell file-shell fun-page-curl" data-fun="file-drawer">
      <ContactsSidebar compact />
      <section className="settings-panel">
        <header className="thread-header settings-header">
          <Link href="/" className="mobile-back" aria-label="Back to chats">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <h1>File</h1>
            <p>
              {ended
                ? "The sample is complete"
                : `${done.length} of ${totalRounds()} hours signed in`}
            </p>
          </div>
        </header>

        <div className="settings-content">
          <section className="settings-group">
            <h2>Tonight&apos;s sample</h2>
            <p className="file-status">{temperatureLabel(temp)}</p>
            <p className="settings-description">
              {cleanPasses} clean · {flagged} flagged · {hires} hired · {obsessed}{" "}
              personal. Later hours are shorter. The brief is on the hour.
            </p>
          </section>

          <section className="settings-group">
            <h2>Building hours</h2>
            <p className="settings-description">
              Twelve slots. Each hour has a brief. Tap a finished hour to reopen
              the chat. Sign the ones you sat through.
            </p>
            <div className="hour-grid fun-drawers" data-fun="hour-drawers">
              {hours.map(({ index, contact }) => {
                const person = contact
                  ? getInterviewer(contact.interviewerId)
                  : null;
                const signed = contact
                  ? file.signedHours.includes(contact.interviewerId)
                  : false;
                const isCurrent = Boolean(
                  current && contact?.interviewerId === current.interviewerId
                );
                const brief = getDirective(contact?.directiveId);
                const href = contact
                  ? `/interview/${contact.interviewerId}`
                  : "/story";
                const stamp = contact?.verdict
                  ? contact.hourScore
                    ? `${verdictLabel(contact.verdict.decision)} · ${
                        contact.hourScore.passed ? "held" : "flagged"
                      }`
                    : verdictLabel(contact.verdict.decision)
                  : contact?.callbackPending
                    ? "Second pass"
                    : isCurrent
                      ? brief?.title || "Waiting"
                      : "Locked";
                return (
                  <div
                    key={index}
                    className={`hour-cell fun-card ${contact ? "filled" : ""} ${
                      isCurrent ? "current" : ""
                    } ${signed ? "signed" : ""} ${
                      contact?.hourScore?.passed
                        ? "passed"
                        : contact?.hourScore && !contact.hourScore.passed
                          ? "flagged"
                          : ""
                    }`}
                  >
                    <Link href={href}>
                      <small>Hour {index + 1}</small>
                      <strong>
                        {person
                          ? person.name.split(" ")[0]
                          : contact
                            ? "Assigned"
                            : "Empty"}
                      </strong>
                      <span>{stamp}</span>
                    </Link>
                    {contact?.verdict && !signed ? (
                      <button
                        type="button"
                        className={`text-button ${signed ? "" : "fun-wet"}`}
                        data-fun="wet-ink"
                        onClick={() => {
                          deskClick("memo-stamp");
                          playFun("wet-ink");
                          signHour(contact.interviewerId);
                        }}
                      >
                        Sign hour
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="settings-group">
            <h2>Badge</h2>
            <p className="settings-description">
              Three clean hours, or three hires, is enough to ask. Asking is not
              the same as receiving. A pending badge changes later hours.
            </p>
            {file.badgeRequested ? (
              <p className="file-status">Pending. They already treat you as inside.</p>
            ) : (
              <button
                type="button"
                className="start-chat-button"
                data-fun="badge-chime"
                onClick={() => {
                  deskClick("badge-chime");
                  grantAward("badge-chime");
                  requestBadge();
                }}
                disabled={!canRequestBadge}
              >
                {canRequestBadge ? "Request a badge" : "Need three clean hours or hires"}
              </button>
            )}
          </section>

          <section className="settings-group">
            <h2>Letters</h2>
            {letters.length === 0 ? (
              <p className="settings-description">
                No stationery yet. Finish an hour.
              </p>
            ) : (
              <div className="letter-list">
                {letters.map((contact) => {
                  const person = getInterviewer(contact.interviewerId);
                  if (!person || !contact.verdict) return null;
                  return (
                    <article key={contact.interviewerId} className="letter-card fun-card" data-fun="card-lift">
                      <div className="letter-card-head">
                        <PersonaAvatar interviewer={person} size="sm" />
                        <div>
                          <strong>{person.name}</strong>
                          <span>
                            {verdictLabel(contact.verdict.decision)} ·{" "}
                            {coverJobLine(contact.appliedJob)}
                          </span>
                        </div>
                      </div>
                      <p>{contact.verdict.letter}</p>
                      <div className="letter-card-actions">
                        <Link
                          href={`/interview/${contact.interviewerId}`}
                          className="text-button"
                        >
                          Open chat
                        </Link>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => download(contact)}
                        >
                          Download PDF
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="settings-group" data-fun="stamp-album">
            <h2>Stamp album</h2>
            <p className="settings-description">
              Letters leave ink. The desk keeps a small album.
            </p>
            <div className="fun-album">
              {(toys.stamps.length ? toys.stamps : ["INTAKE"]).map((stamp) => (
                <b key={stamp} className="fun-album-stamp">
                  {stamp}
                </b>
              ))}
            </div>
          </section>

          <section className="settings-group" data-fun="pin-file">
            <h2>Clipped lines</h2>
            {toys.pins.length === 0 ? (
              <p className="settings-description">
                Double-tap a line during an hour to clip it here.
              </p>
            ) : (
              <div className="fun-pin-list">
                {toys.pins.map((pin) => (
                  <article key={pin.id} className="memo-card">
                    <p className="app-kicker">{pin.name}</p>
                    <p>{pin.text}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="settings-group">
            <h2>Night notes</h2>
            <p className="settings-description">
              Private to this browser. Write during an hour or after the letter.
            </p>
            <NightNote interviewerId="desk" />
            {contacts.map((contact) => {
              const person = getInterviewer(contact.interviewerId);
              if (!person) return null;
              const note = getNote(file, contact.interviewerId);
              return (
                <details
                  key={contact.interviewerId}
                  className="note-folder"
                >
                  <summary>
                    {person.name}
                    <span>
                      {note ? "Has a note" : coverRoleLine(person)}
                    </span>
                  </summary>
                  <NightNote
                    key={contact.interviewerId}
                    interviewerId={contact.interviewerId}
                    compact
                  />
                </details>
              );
            })}
          </section>

          <section className="settings-group">
            <h2>Memos</h2>
            <p className="settings-description">
              The desk releases paper as hours close. Nothing here is a roster.
            </p>
            <div className="memo-list" data-fun="memo-flip">
              {memos.map((memo) => (
                <article key={memo.id} className="memo-card fun-flip fun-card" data-fun="page-curl">
                  <p className="app-kicker">{memo.kicker}</p>
                  <h3>{memo.title}</h3>
                  <p>{memo.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <MessengerNav active="file" />
      </section>
    </main>
  );
}

function hourContact(contacts: AssignedContact[], index: number) {
  const chronological = [...contacts].sort((a, b) => a.createdAt - b.createdAt);
  return chronological[index] ?? null;
}
