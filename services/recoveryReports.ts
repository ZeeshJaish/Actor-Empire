import { Capacitor } from '@capacitor/core';
import type { Player } from '../types';
import {
    getIssueReportDelivery,
    onIssueReportDeliveryChanged,
    recordNonFatal,
    submitPlayerIssueReport,
    type IssueReportDelivery,
    type PlayerIssueReportPayload,
} from './firebaseService';
import { noteStoreReviewTrouble } from './storeReview';

/* 2026-11-17 (Zeesh): the recovery popups say sorry and send a report in one tap (components/RecoveryReportCard.tsx).
   A report is the Settings one (Settings › Report a problem: the week trace, device and save facts) plus the popup's
   own facts. Sending it never changes or saves the career. */

/** A sent report as the popups see it. The popups import only this type, so they stay free of Firebase. */
export type RecoveryReportHandle = {
    id: string;
    delivery: () => IssueReportDelivery | null;
    onChange: (listener: (delivery: IssueReportDelivery) => void) => () => void;
};
const handleFor = (id: string): RecoveryReportHandle => ({
    id,
    delivery: () => getIssueReportDelivery(id),
    onChange: listener => onIssueReportDeliveryChanged((issueId, delivery) => { if (issueId === id) listener(delivery); }),
});

/** Sends a recovery report. A career too broken to describe is replaced by `fallback()`, so the popup's facts still go. */
export const sendRecoveryReport = (source: Player, payload: PlayerIssueReportPayload, fallback?: () => Player): RecoveryReportHandle | null => {
    noteStoreReviewTrouble('issue_report');
    const extra = { device_platform: Capacitor.getPlatform(), ...(payload.extra || {}) };
    try {
        return handleFor(submitPlayerIssueReport(source, { ...payload, extra }));
    } catch (error) {
        recordNonFatal(error, 'recovery_report_failed', { report_source: String(payload.extra?.report_source || '') });
        if (!fallback) return null;
        try {
            return handleFor(submitPlayerIssueReport(fallback(), { ...payload, extra: { ...extra, report_player: 'fallback' } }));
        } catch {
            return null;
        }
    }
};

/** "Week N was not applied" (WeekProcessingRecoveryModal). */
export const weekFailureReport = (
    failure: { week: number; failureCode: string; failedStage: string; failures: string[] },
    page: string,
): PlayerIssueReportPayload => ({
    category: 'WEEK_FAILED',
    details: `Week ${failure.week} was not applied. ${failure.failureCode} while "${failure.failedStage}". ${failure.failures.join(' ')}`,
    currentPage: page,
    currentScreen: 'WeekRecovery',
    extra: { report_source: 'week_recovery_popup', failure_code: failure.failureCode, failed_stage: failure.failedStage },
});

/** "Safe backup found": the newest career file failed its safety check (SaveRecoveryModal). */
export const saveRecoveryReport = (recovery: { slot: number; violations: string[] }): PlayerIssueReportPayload => ({
    category: 'SAVE_LOAD',
    details: `Safe backup found: the latest career file did not pass its safety check. ${recovery.violations.join('; ')}`,
    currentScreen: 'SaveRecovery',
    extra: {
        report_source: 'save_recovery_popup',
        recovery_slot: recovery.slot,
        violations: recovery.violations.slice(0, 12).join(' | ').slice(0, 900),
    },
});

/** "Recovery Mode": a screen failed to draw (App's GameErrorBoundary). */
export const recoveryModeReport = (error: { message: string; stack: string }, page: string): PlayerIssueReportPayload => ({
    category: 'RECOVERY_MODE',
    details: `Recovery Mode: ${error.message}`,
    currentPage: page,
    currentScreen: 'RecoveryMode',
    extra: { report_source: 'recovery_mode', render_error: error.message, render_stack: error.stack },
});
