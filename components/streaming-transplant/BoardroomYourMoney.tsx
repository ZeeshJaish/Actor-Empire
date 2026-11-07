/*
 * #209 (plan §23.10, §23.12): YOUR MONEY, the one place to see what you get from the company and how. Zeesh (2026-11-04):
 * "sab cheezo ka proper screen banana like salery and stuff wwala idk hai ki nahi , also upaisa kaha se apne personal me le
 * sakta yeh bhi pata nahi hai user ko".
 *
 * #220 (plan §24): it lives inside Studio Finance › Capital now, not over it. Zeesh: "फाइनेंस हमारा पैसा निकालने का जो भी स्टेप एक जगह
 * रहता ना"; "capital ke ander". Your wallet and your stake; money in and out on one control; your salary; a bonus; and
 * what you have had this year, with the tax it will bring.
 */
import React, { useEffect, useState } from 'react';
import css from './presentation/screens/Boardroom/BoardroomYourMoney.module.css';
import { cx } from './presentation/cx';
import type { StreamingYourMoneyView } from '../../services/streamingYourMoney';

export interface YourMoneyActions {
    putIn: (amount: number) => { ok: boolean; message?: string };
    setSalary: (weekly: number) => { ok: boolean; message?: string };
    payBonus: (amount: number) => { ok: boolean; message?: string };
    takeOut: (toYou: number) => { ok: boolean; message?: string };
    /** #221: the estate, all at once */
    payOffEstate: () => { ok: boolean; message?: string };
    openMarkets?: () => void;
    openBank?: () => void;
}

const money = (value: number): string => {
    const abs = Math.abs(value);
    const text = abs >= 1e9 ? `$${(abs / 1e9).toFixed(2).replace(/\.?0+$/, '')}B` : abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M` : abs >= 1e3 ? `$${Math.round(abs / 1e3)}K` : `$${Math.round(abs)}`;
    return value < 0 ? `−${text}` : text;
};

/* one amount, typed or stepped; `unit` is what the number counts in */
const Amount = ({ value, unit, unitLabel, step, onChange, label }: { value: number; unit: number; unitLabel: string; step: number; onChange: (next: number) => void; label: string }) => {
    const [typed, setTyped] = useState<string | null>(null);
    /* what was typed, until the amount is something else (it was paid, or the way changed) */
    useEffect(() => { setTyped(current => (current !== null && Math.round(Number(current) * unit) !== value ? null : current)); }, [value, unit]);
    const shown = typed ?? String(Math.round(value / unit * 10) / 10);
    return (
        <div className={css.amount}>
            <button type="button" aria-label={`Less ${label}`} disabled={value <= 0} onClick={() => { setTyped(null); onChange(Math.max(0, value - step)); }}>−</button>
            <label className={css.amountValue}>
                <i>$</i>
                <input
                    inputMode="decimal"
                    aria-label={label}
                    style={{ width: `${Math.max(1, shown.length) + 0.4}ch` }}
                    value={shown}
                    onChange={event => {
                        setTyped(event.target.value);
                        const number = Number(event.target.value);
                        if (Number.isFinite(number) && number >= 0) onChange(Math.round(number * unit));
                    }}
                    onBlur={() => setTyped(null)}
                />
                <i>{unitLabel}</i>
            </label>
            <button type="button" aria-label={`More ${label}`} onClick={() => { setTyped(null); onChange(value + step); }}>+</button>
        </div>
    );
};

/** before the launch `view` is null: only your wallet, and putting money in */
export const YourMoneyPanel = ({ view, wallet, startPutIn, actions }: { view: StreamingYourMoneyView | null; wallet: number; startPutIn?: boolean; actions: YourMoneyActions }) => {
    const [dir, setDir] = useState<'IN' | 'OUT'>(startPutIn || !view ? 'IN' : 'OUT');
    const [moved, setMoved] = useState(0);
    const [salary, setSalary] = useState(view?.salary.weekly ?? 0);
    const [bonus, setBonus] = useState(0);
    const [note, setNote] = useState<string | null>(null);
    useEffect(() => { setSalary(view?.salary.weekly ?? 0); }, [view?.salary.weekly]);
    const say = (result: { ok: boolean; message?: string }, reset?: () => void) => {
        setNote(result.message || (result.ok ? 'Done.' : 'That could not be done.'));
        if (result.ok) reset?.();
    };
    const treasury = view?.treasury ?? 0;
    const bigStep = Math.max(1_000_000, Math.round(Math.max(view?.takeOut.mostToYou ?? 0, wallet * 0.1, treasury * 0.05) * 0.05 / 1_000_000) * 1_000_000);
    const salaryStep = (view?.marketPay ?? 0) >= 500_000 ? 25_000 : 5_000;
    const share = view?.takeOut.yourShare ?? 1;
    const leaves = share > 0 ? moved / share : moved;
    const others = leaves - moved;
    const year = view?.thisYear;
    const yearTotal = year ? year.salary + year.bonus + year.dividends + year.takenOut : 0;
    return (
        /* what you do with your own money is yours to do, in the chair too */
        <div className={css.panel} data-chair-ok>
            <div className={css.wallet}>
                <div><small>IN YOUR WALLET</small><b>{money(wallet)}</b></div>
                {view && <div><small>YOUR STAKE · {view.stakePercent.toFixed(1)}%</small><b>{money(view.stakeValue)}</b></div>}
            </div>

            <section className="cp-card">
                <header className={cx('cp-head', css.head)}><h2>Move money</h2>{view && <span>company cash {money(treasury)}</span>}</header>
                {view && (
                    <div className={css.seg} role="group" aria-label="Which way">
                        <button type="button" className={dir === 'IN' ? css.segOn : ''} aria-pressed={dir === 'IN'} onClick={() => { setDir('IN'); setMoved(0); }}>Put in</button>
                        <button type="button" className={dir === 'OUT' ? css.segOn : ''} aria-pressed={dir === 'OUT'} onClick={() => { setDir('OUT'); setMoved(0); }}>Take out</button>
                    </div>
                )}
                {dir === 'IN' && (
                    <>
                        <Amount value={moved} unit={1_000_000} unitLabel="M" step={bigStep} onChange={setMoved} label="money in" />
                        <button type="button" className={cx('sf-btn sf-btn--primary', css.go)} disabled={moved <= 0 || moved > wallet} onClick={() => say(actions.putIn(moved), () => setMoved(0))}>
                            {moved > wallet ? 'More than your wallet holds' : `Put ${money(moved)} in`}
                        </button>
                        <p className={css.line}>From your wallet into the company. No shares change hands and no interest is due, but it stays in the company.</p>
                        {actions.openBank && (
                            <button type="button" className={css.door} onClick={actions.openBank}>
                                <span><b>Borrow from your bank</b><small>A personal loan, in your phone's Bank app. Then put it in here.</small></span>
                                <em aria-hidden="true">›</em>
                            </button>
                        )}
                    </>
                )}
                {dir === 'OUT' && view && (
                    <>
                        {!view.listed && view.takeOut.allowed && (
                            <>
                                <Amount value={moved} unit={1_000_000} unitLabel="M to you" step={bigStep} onChange={setMoved} label="money out" />
                                <div className={css.facts}>
                                    <span><small>TO YOU</small><b>{money(moved)}</b></span>
                                    <span><small>TO OTHERS</small><b>{money(others)}</b></span>
                                    <span><small>UP TO</small><b>{money(view.takeOut.mostToYou)}</b></span>
                                </div>
                                <button type="button" className={cx('sf-btn sf-btn--primary', css.go)} disabled={moved <= 0} onClick={() => say(actions.takeOut(moved), () => setMoved(0))}>Take {money(moved)} out</button>
                            </>
                        )}
                        {view.listed && view.dividend && actions.openMarkets && (
                            <button type="button" className={css.door} onClick={actions.openMarkets}>
                                <span><b>{view.dividend.perShare > 0 ? `$${view.dividend.perShare.toFixed(2)} a share each quarter` : 'No dividend yet'}</b><small>{view.dividend.perShare > 0 ? `${view.dividend.yieldPercent}% a year · next in ${view.dividend.nextInWeeks} weeks` : 'Set it on MARKETS'}</small></span>
                                <em aria-hidden="true">›</em>
                            </button>
                        )}
                        <p className={css.line}>{view.takeOut.line}</p>
                    </>
                )}
            </section>

            {view?.estate && (
                <section className="cp-card">
                    <header className={cx('cp-head', css.head)}><h2>The estate</h2><span>{money(view.estate.owed)} left</span></header>
                    <div className={css.rows}>
                        <div><span>Next payment, in {view.estate.nextInWeeks} week{view.estate.nextInWeeks === 1 ? '' : 's'}</span><b>{money(view.estate.quarterly)}</b></div>
                        <div><span>Payments left</span><b>{view.estate.quartersLeft}</b></div>
                        <div><span>Interest</span><b>{view.estate.ratePercent}% a year</b></div>
                        {view.estate.short > 0 && <div className={css.rowTax}><span>Your wallet is short</span><b>{money(view.estate.short)}</b></div>}
                    </div>
                    <button type="button" className={cx('sf-btn sf-btn--primary', css.go)} disabled={!view.estate.canPayOff} onClick={() => say(actions.payOffEstate())}>Pay it off · {money(view.estate.owed)}</button>
                    <p className={css.line}>{view.estate.short > 0 ? 'What your wallet cannot cover, shares are sold for, under their worth. A dividend or your salary can fill it first.' : 'From your wallet, each quarter. If the company or your shares are sold, the rest falls due at once.'}</p>
                </section>
            )}

            {view && (
                <>
                    <section className="cp-card">
                        <header className={cx('cp-head', css.head)}><h2>Your salary</h2><span>{view.salary.paidNow > 0 ? `${money(view.salary.paidNow)} a week now` : 'nothing now'}</span></header>
                        {view.salary.canSet && (
                            <>
                                <Amount value={salary} unit={1_000} unitLabel="K a week" step={salaryStep} onChange={setSalary} label="salary a week" />
                                <button type="button" className={cx('sf-btn sf-btn--primary', css.go)} disabled={salary === view.salary.weekly} onClick={() => say(actions.setSalary(salary))}>
                                    {salary === view.salary.weekly ? 'Your salary now' : `Set ${money(salary)} a week`}
                                </button>
                            </>
                        )}
                        <p className={css.line}>{view.salary.line}</p>
                    </section>

                    <section className="cp-card">
                        <header className={cx('cp-head', css.head)}><h2>A bonus</h2><span>once</span></header>
                        {view.bonus.canPay && (
                            <>
                                <Amount value={bonus} unit={1_000_000} unitLabel="M" step={bigStep} onChange={setBonus} label="bonus" />
                                <button type="button" className={cx('sf-btn sf-btn--primary', css.go)} disabled={bonus <= 0} onClick={() => say(actions.payBonus(bonus), () => setBonus(0))}>Pay {money(bonus)}</button>
                            </>
                        )}
                        <p className={css.line}>{view.bonus.line}</p>
                    </section>

                    <section className="cp-card">
                        <header className={cx('cp-head', css.head)}><h2>This year</h2><span>{money(yearTotal)} before tax</span></header>
                        <div className={css.rows}>
                            <div><span>Salary</span><b>{money(year!.salary)}</b></div>
                            <div><span>Bonus</span><b>{money(year!.bonus)}</b></div>
                            <div><span>{view.listed ? 'Dividends' : 'Taken out'}</span><b>{money(view.listed ? year!.dividends : year!.takenOut + year!.dividends)}</b></div>
                            <div className={css.rowTax}><span>Income tax, 15%, at the year's end</span><b>{money(year!.tax)}</b></div>
                        </div>
                        <p className={css.line}>{view.sellLine}</p>
                    </section>
                </>
            )}

            {note && <p className={css.toast} role="status">{note}</p>}
        </div>
    );
};
