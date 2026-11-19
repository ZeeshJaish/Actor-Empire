import { forecastCinemaProject } from './boxOfficeForecastAdapter';
/* Phase 1 of the week-speed plan (2026-11-17), item 7: the panel now posts the career as it is (one structured copy,
   made by postMessage) and this worker makes the JSON copy the panel used to make on the main thread on every tap.
   So the forecast reads exactly the same data as before (JSON drops undefined and functions, turns NaN into null). */
self.onmessage=({data})=>{try {
    const input=data&&data.jsonCopyInWorker?JSON.parse(JSON.stringify(data)):data;
    self.postMessage({requestId:input.requestId,forecast:forecastCinemaProject(input.player,input.project,input.titleId,input.releaseWeek)});
}
catch(error){self.postMessage({requestId:data?.requestId,error:error instanceof Error?error.message:'Forecast unavailable'})}};
