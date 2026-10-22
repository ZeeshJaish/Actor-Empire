import React from 'react';
import type { Player } from '../types';
import { getCinemaProjectFinance, type CinemaFinanceSource } from '../services/boxOffice/boxOfficeSettlement';
import { formatMoney } from '../services/formatUtils';
/** Same presenter used by live settlement's outcome and existing return reports. No alternative profit arithmetic. */
export const CinemaFinancePanel=({source,player}:{source:CinemaFinanceSource;player?:Player})=>{
    const f=getCinemaProjectFinance(source);
    return <section aria-label="Cinema financial report" className="m-3 rounded-xl border border-emerald-300/20 bg-zinc-950 p-3 text-xs text-zinc-200 space-y-2">
        <h3 className="font-bold text-emerald-200">Project financial report{f.receiptsEstimated||f.costsEstimated?' · includes historical estimates':''}</h3>
        <dl className="grid grid-cols-2 gap-3">{Object.entries({'Public theatrical gross':f.publicGrossCents,'Theatrical producer receipts':f.theatricalProducerReceiptsCents,'Collected producer receipts, all media':f.producerReceiptsCents,'Production and paid release costs':f.totalPaidCostsCents,'Investor payouts':f.investorPayoutCents,'Talent backend paid':f.talentBackendCents,'Net studio receipts':f.netStudioReceiptsCents,'Project profit after costs':f.netProfitCents,...(typeof source.earnings==='number'&&source.earnings>0?{'Recorded career earnings':f.actorEarningsCents}:{})}).map(([label,value])=><div className="min-w-0" key={label}><dt className="text-zinc-400">{label}</dt><dd className="break-words font-semibold">{formatMoney(value/100)}</dd></div>)}</dl>
        {player?.world.cinemaMarket?.titles[source.id||'']&&<p>Signed actor backend paid since tracking began: {formatMoney(player.world.cinemaMarket.titles[source.id!].actorPaidCents/100)}</p>}
        {!(typeof source.earnings==='number'&&source.earnings>0)&&<p className="text-zinc-400">Total actor earnings are not recorded on this release.</p>}
        <p className="text-zinc-400">Public gross includes the cinema share. Actor pay is reported separately; upfront pay is already in production cost.</p>
    </section>;
};
